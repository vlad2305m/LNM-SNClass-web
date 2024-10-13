"use client"

import { api } from "~/trpc/react";
import type { Props } from "~/components/snmodel-chart";
import { useEffect, useReducer, useState } from "react";

import { SNModelChartComponent } from "~/components/snmodel-chart";
import { models_list, type_dict } from "~/components/snmodel-chart-model-to-type-map";
import { ModelsComputeButton, ModelsReloadButton } from "./compute_button";
import { KILLER_TRANSIENT } from '~/lib/shared_constants';
import { cSecondsToTime, timeToCSeconds } from "~/lib/times";
import type { get_db_models_and_phot } from "~/server/celery";
import { Travolta } from "~/app/not-found";

export function ModelsClient(props: {transient: string, phot: Promise<Props["phot"]>, models: ReturnType<typeof get_db_models_and_phot>, can_compute: Promise<boolean>}) {
  const [can_compute, set_can_compute] = useState(false);
  useEffect(()=> {void props.can_compute.then(set_can_compute);}, [props.can_compute]);

  const transient = props.transient;
  const [phot_data, set_phot_data] = useState<Awaited<typeof props.phot>>([]);
  useEffect(()=> {void props.phot.then(set_phot_data);}, [props.phot]);
  type models = Props["model"][];
  function merge_arrs<T>(a: T[], b: T[], comp: (a:T, b:T) => boolean){
    const res = a.slice();
    for (const e of b) {
      for (const e2 of a) {
        if (!comp(e, e2)) res.push(e);
      }
    }
    return res;
  }
  const [sorted_models, add_sorted_model] = useReducer(
    (s: models, a: [models, boolean]) => a[1] ? a[0].sort((a,b) => b.logl - a.logl) : merge_arrs(a[0], s, (a,b)=>a.model==b.model).sort((a,b) => b.logl - a.logl), 
    // models_list.map((s)=>(
    //   {model: s, bands: [], data: [], id: 0, logl: 0, logz_err: 0, transient: transient, time_spent: "00:00:00.00", updatedAt: null, createdAt: new Date()}
    // )) as models
    []);

  const [model_limit, set_model_limit] = useState(5);
  useEffect(() => {void props.models.then((pnm) => {
    if (pnm.error) set_error(pnm.error);
    else {
      if (sorted_models.filter((m) => m.data.length > 0).length == 0) {
        add_sorted_model([pnm.models!, true]);
      }
    };
  })}, [props.models, sorted_models]);
  useEffect(() => {
    let new_limit = Math.min(sorted_models.length, model_limit+5);
    if (new_limit > 20) new_limit = sorted_models.length;
    if (model_limit != new_limit) {
      const id = setTimeout(() => {
        set_model_limit(new_limit);
      }, 1)
      return () => clearTimeout(id);
    }
  }, [sorted_models, model_limit]);
  api.post.subLoadModelFitsForTransient.useSubscription( { transient },
    { onData(model) {
      if (model.transient !== KILLER_TRANSIENT) add_sorted_model([[model], false]);
    }}
  );
  const [error, set_error] = useState("");
  if (error) return <Travolta><h1>{error}</h1></Travolta>;
  //const { mutate, error } = api.post.compute_models_for_transient.useMutation();
  return <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
  <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
    {transient}
  </h1>
  <div>
    Total: {sorted_models.length} models, predicted: {type_dict[sorted_models?.[0]?.model ?? '']},&nbsp;
    <a className="underline text-blue-600" href={"https://lasair-ztf.lsst.ac.uk/objects/"+transient+"/"}>Lasair</a>,&nbsp;
    CPU time: {cSecondsToTime(sorted_models.map((m) => timeToCSeconds(m.time_spent)).reduce((a, b)=>a+b, 0))}
  </div>
  {can_compute && <div className="flex flex-row gap-1">
      <ModelsComputeButton transient={transient}></ModelsComputeButton>
      <ModelsReloadButton transient={transient}></ModelsReloadButton>
    </div>}
  <div className="flex flex-row flex-wrap justify-center">
      {sorted_models.slice(0, model_limit).map((model) => <SNModelChartComponent phot={phot_data} model={model} key={model.model}></SNModelChartComponent>)}
  </div>
</div>;
}