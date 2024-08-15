import 'server-only';
import * as Celery from "celery-ts";
import { revalidateTag, unstable_cache } from 'next/cache';
import { db } from "./db";
import { model_fits } from "./db/schema";
import { and, eq } from "drizzle-orm";
import assert from "assert";

export const celery_client: Celery.Client = Celery.createClient({
  brokerUrl: "redis://localhost",
  resultBackend: "redis://localhost",
});


export function celery_exec<Ta, Tr>(t: string, args: Array<Ta>, kwargs: object = {}) {
  const tt = celery_client.createTask<Tr>(t+"").applyAsync({
    args: args,
    kwargs: kwargs,
    compression: Celery.Compressor.Zlib,
  })
  return tt.get();
}

type Model_with_args = {
  model: string,
  params: {
    t0: number,
    z: number,
    amplitude?: number,
    x0?: number,
    x1?: number,
    c?:  number,
  }
}
export type Model_with_flux = {
  model: string, 
  bands: string[], 
  data: {
    time: number, 
    ztfr?: number, ztfg?: number,
  }[]
}
const get_model_flux_task = celery_client.createTask<{model: string, bands: string[], data: {time: number[], ztfr?: number[], ztfg?: number[]}}[]>("tasks.get_model_flux");
export async function get_model_flux_for_graph(models: Model_with_args[]) {
  if (models.length < 1) return [];
  const fluxes = await get_model_flux_task.applyAsync({args:[models], kwargs:{}, compression: Celery.Compressor.Zlib}).get();
  const ans: Model_with_flux[] = Array<Model_with_flux>(models.length);
  for (let index = 0; index<models.length; index++) {
    const flux = fluxes[index]!;
    const modDataT = flux.data;
    const modData: {time: number, ztfr?: number, ztfg?: number}[] = Array<{time: number, ztfr?: number, ztfg?: number}>(modDataT.time.length);
    for(let i = 0; i<modDataT.time.length; i++) {
      modData[i] = {time: modDataT.time[i]!, ztfr: modDataT.ztfr?.at(i), ztfg: modDataT.ztfg?.at(i)};
    }
    ans[index] = {model: flux.model, bands: flux.bands, data: modData};
  }
  return ans;
}


const get_lasair_phot_task = celery_client.createTask<
    {time: number[], band: string[], flux: number[], flux_err: number[], exc_message?: string[]}
>("tasks.get_lasair_phot");
const get_cached_phot_data = unstable_cache(
  async (transient: string) => get_lasair_phot_task.applyAsync({args:[transient], kwargs:{}, compression: Celery.Compressor.Zlib}).get(),
  ['phot-data-cache'],
  { tags: ['lasair'],
    revalidate: 3600 * 24}
);

export async function get_phot_data_for_graph(transient: string) {
  let photDataT = await get_cached_phot_data(transient);
  if (photDataT.exc_message && photDataT.exc_message[0] && photDataT.exc_message[0].includes("does not exist in the catalog")) return [];
  if (photDataT.time === undefined) {
    revalidateTag("lasair");
    photDataT = await get_cached_phot_data(transient);
  }
  const photData: {time: number, band: string, flux: number, flux_err: number}[] = Array<{time: number, band: string, flux: number, flux_err: number}>(photDataT.time.length);
  for(let i = 0; i<photDataT.time.length; i++) {
    photData[i] = {time: photDataT.time[i]!, band: photDataT.band[i]!, flux: photDataT.flux[i]!, flux_err: photDataT.flux_err[i]!};
  }
  return photData;
}

const fit_model_task = celery_client.createTask<{
                                                  model: string, 
                                                  type: string, 
                                                  time: number, 
                                                  logz: number, logz_err: number, 
                                                  logl: number, logl_err: number, 
                                                  z: number, z_err: number, 
                                                  t0: number, t0_err: number, 
                                                  amplitude?: number, amplitude_err?: number, 
                                                  x0?: number, x0_err?: number, 
                                                  x1?: number, x1_err?: number, 
                                                  c?: number, c_err?: number, 
                                                }>("tasks.fit_model");
export async function fit_model(transient: string, model: string) {
  const data = await get_cached_phot_data(transient);
  const n_points = data.time.length;
  const ex_data = await db.query.model_fits.findFirst({
    where: (model_fits, {eq, and}) => and(eq(model_fits.transient, transient), eq(model_fits.model, model), eq(model_fits.n_points, n_points))
  });
  let insp;
  if (ex_data === undefined) {console.log("insert");insp = db.insert(model_fits).values({
    status: "pending",
    transient: transient,
    model: model,
    n_points: n_points,
  });}
  else {insp = db.update(model_fits).set({
    status: "pending",
  }).where(eq(model_fits.id, ex_data.id))}
  const fit_res = await fit_model_task.applyAsync({args:[data, model], kwargs:{}, compression: Celery.Compressor.Zlib}).get();
  if (fit_res.time === undefined) {
    void db.update(model_fits).set({
      status: "error", //TODO error handling
    }).where(and(eq(model_fits.transient, transient), eq(model_fits.model, model), eq(model_fits.n_points, n_points))).then();
    return undefined;
  }
  const float_to_2dstr = (n: number) => (Math.floor(n)%100).toString().padStart(2, "0");
  const time_str = float_to_2dstr(fit_res.time/3600)+":"+float_to_2dstr(fit_res.time/60)+":"+float_to_2dstr(fit_res.time)+"."+float_to_2dstr(fit_res.time*100);
  const ans = {amplitude: 0, amplitude_err: 0, 
    x0: 0, x0_err: 0, 
    x1: 0, x1_err: 0, 
    c: 0, c_err: 0, 
    ...fit_res, time_spent: time_str};
  await insp;
  void db.update(model_fits).set({
    ...ans,
    status: "done", //TODO error handling
  }).where(and(eq(model_fits.transient, transient), eq(model_fits.model, model), eq(model_fits.n_points, n_points))).then();
  return ans;
}

export async function get_db_or_fit_model(transient: string, model: string) {
  let computed = false;
  let ex_data = await db.query.model_fits.findFirst({
    where: (model_fits, {eq, and}) => and(eq(model_fits.transient, transient), eq(model_fits.model, model)),
    orderBy: (model_fits, {desc}) => [desc(model_fits.n_points)], // TODO: lowest or highest? 
  });
  if (ex_data === undefined) {
    computed = true;
    const fit = await fit_model(transient, model);
    ex_data = await db.query.model_fits.findFirst({
      where: (model_fits, {eq, and}) => and(eq(model_fits.transient, transient), eq(model_fits.model, model)),
      orderBy: (model_fits, {desc}) => [desc(model_fits.n_points)], // TODO: lowest or highest? 
    });
    ex_data = {...ex_data!, ...fit};
  }
  return {...ex_data, computed: computed };
}

export const get_db_models_and_phot = unstable_cache(
  get_db_models_and_phot_uncached,
  ['model-data-cache'],
  { tags: ['lasair2'],
    revalidate: 3600 * 1}
)
export async function get_db_models_and_phot_uncached(transient: string) {
  const data = await get_cached_phot_data(transient);
  if (data.exc_message && data.exc_message[0] && data.exc_message[0].includes("does not exist in the catalog")) return {error: "Transient not found in the catalog"};
  const n_points = data.time.length;
  const mod_data = await db.query.model_fits.findMany({
    where: (model_fits, {eq, and}) => and(eq(model_fits.transient, transient), eq(model_fits.n_points, n_points)),
    orderBy: (model_fits, {desc}) => [desc(model_fits.n_points)], // TODO: lowest or highest? 
  });
  const phot = await get_model_flux_for_graph(mod_data.map((data) => ({model: data.model, params: {t0: data.t0, z: data.z, amplitude: data.amplitude, x0: data.x0, x1: data.x1, c: data.c}})));
  return {phot: data, models: mod_data.map((data, index) => {assert(data.model === phot[index]?.model);return {...data, ...phot[index]};})};
}
