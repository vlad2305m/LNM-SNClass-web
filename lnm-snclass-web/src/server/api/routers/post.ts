import 'server-only';
import { on } from 'events';
import { Session } from "next-auth";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import * as Redis from "ioredis";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { get_db_or_fit_model, get_model_flux_for_graph } from "~/server/celery";
import { db } from "~/server/db";
import { CAN_COMPUTE_TRANSIENT } from "~/server/db/schema";
import { KILLER_TRANSIENT } from '~/lib/shared_constants';

const redis_pub = new Redis();
setInterval(() => redis_pub.publish("modelFitForModelsPage", '{"transient":"'+KILLER_TRANSIENT+'"}'),  10 * 60 * 1000); // kill dangling connections to Redis
const redis_sub = new Redis();
redis_sub.subscribe("modelFitForModelsPage", (err: any, count: number) => {
  if (err) {
    // Just like other commands, subscribe() can fail for some reasons,
    // ex network issues.
    console.error("Failed to subscribe: %s", err.message);
  } else {
    // `count` represents the number of channels this client are currently subscribed to.
    console.log(
      `Subscribed successfully! This client is currently subscribed to ${count} channels.`
    );
  }
});

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(async ({ input }) => {
      const ans0 = "";
      return {
        greeting: `Hello ${input.text}, ${JSON.stringify(ans0)}`,
      };
    }),

  
  getLatest: publicProcedure.query(({ ctx }) => {
    return ctx.db.query.posts.findFirst({
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    });
  }),

  compute_models_for_transient: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (! await can_compute_transient(ctx.session)) return "Error: no Perm";
      revalidateTag("lasair2");
      const mt = 
        await Promise.all(['salt2', 'hsiao', 'hsiao-subsampled', 'nugent-hyper', 'nugent-sn1a', 'nugent-sn1bc', 'nugent-sn2l', 'nugent-sn2n', 'nugent-sn2p', 'nugent-sn91bg', 'nugent-sn91t', 's11-2004hx', 's11-2005gi', 's11-2005hl', 's11-2005hm', 's11-2005lc', 's11-2006fo', 's11-2006jl', 's11-2006jo', 'snana-04d1la', 'snana-04d4jv', 'snana-2004fe', 'snana-2004gq', 'snana-2004gv', 'snana-2004hx', 'snana-2004ib', 'snana-2005gi',
          'snana-2005hm', 'snana-2006ep', 'snana-2006ez', 'snana-2006fo', 'snana-2006gq', 'snana-2006iw', 'snana-2006ix', 'snana-2006jl', 'snana-2006jo', 'snana-2006kn', 'snana-2006kv', 'snana-2006lc', 'snana-2006ns', 'snana-2007iz', 'snana-2007kw', 'snana-2007ky', 'snana-2007lb', 'snana-2007ld', 'snana-2007lj', 'snana-2007ll', 'snana-2007lx', 'snana-2007lz', 'snana-2007md', 'snana-2007ms', 'snana-2007nc', 'snana-2007nr', 'snana-2007nv', 'snana-2007og', 'snana-2007pg', 'snana-2007y', 'snana-sdss004012', 'snana-sdss014475', 'snf-2011fe', 'v19-1987a', 'v19-1987a-corr', 'v19-1993j', 'v19-1993j-corr', 'v19-1994i', 'v19-1994i-corr', 'v19-1998bw', 'v19-1998bw-corr', 'v19-1999dn', 'v19-1999dn-corr', 'v19-1999em', 'v19-1999em-corr', 'v19-2002ap', 'v19-2002ap-corr', 'v19-2004aw', 'v19-2004aw-corr', 'v19-2004et', 'v19-2004et-corr', 'v19-2004fe', 'v19-2004fe-corr', 'v19-2004gq', 'v19-2004gq-corr', 'v19-2004gt', 'v19-2004gt-corr', 'v19-2004gv', 'v19-2004gv-corr', 'v19-2005bf', 'v19-2005bf-corr', 'v19-2005hg', 'v19-2005hg-corr', 'v19-2006aa', 'v19-2006aa-corr', 'v19-2006ep', 'v19-2007gr', 'v19-2007gr-corr', 'v19-2007od', 'v19-2007od-corr', 'v19-2007pk', 'v19-2007pk-corr', 'v19-2007ru', 'v19-2007ru-corr', 'v19-2007uy', 'v19-2007uy-corr', 'v19-2007y', 'v19-2007y-corr', 'v19-2008aq', 'v19-2008aq-corr', 'v19-2008ax', 'v19-2008ax-corr', 'v19-2008bj', 'v19-2008bj-corr', 'v19-2008bo', 'v19-2008bo-corr', 'v19-2008d', 'v19-2008d-corr', 'v19-2008fq', 'v19-2008fq-corr', 'v19-2008in', 'v19-2008in-corr', 'v19-2009bb', 'v19-2009bb-corr', 'v19-2009bw', 'v19-2009bw-corr', 'v19-2009dd', 'v19-2009dd-corr', 'v19-2009ib', 'v19-2009ib-corr', 'v19-2009ip', 'v19-2009ip-corr', 'v19-2009iz', 'v19-2009iz-corr', 'v19-2009jf', 'v19-2009jf-corr', 'v19-2009kr', 'v19-2009kr-corr', 'v19-2009n', 'v19-2009n-corr', 'v19-2010al', 'v19-2010al-corr', 'v19-2011bm', 'v19-2011bm-corr', 'v19-2011dh', 'v19-2011dh-corr', 'v19-2011ei', 'v19-2011ei-corr', 'v19-2011fu', 'v19-2011fu-corr', 'v19-2011hs', 'v19-2011hs-corr', 'v19-2011ht', 'v19-2011ht-corr', 'v19-2012a', 'v19-2012a-corr', 'v19-2012ap', 'v19-2012ap-corr', 'v19-2012au', 'v19-2012au-corr', 'v19-2012aw', 'v19-2012aw-corr', 'v19-2013ab', 'v19-2013ab-corr', 'v19-2013am', 'v19-2013am-corr', 'v19-2013by', 'v19-2013by-corr', 'v19-2013df', 'v19-2013df-corr', 'v19-2013ej', 'v19-2013ej-corr', 'v19-2013fs', 'v19-2013fs-corr', 'v19-2013ge', 'v19-2013ge-corr', 'v19-2014g', 'v19-2014g-corr', 'v19-2016bkv', 'v19-2016bkv-corr', 'v19-2016gkg', 'v19-2016gkg-corr', 'v19-2016x', 'v19-2016x-corr', 'v19-asassn14jb', 'v19-asassn14jb-corr', 'v19-asassn15oz', 'v19-asassn15oz-corr', 'v19-iptf13bvn', 'v19-iptf13bvn-corr'
        ]
        .map(async (model) => {
          const fit_model = await get_db_or_fit_model(input.name, model)
          if (fit_model.computed) {
            const data = fit_model;
            const phot = await get_model_flux_for_graph([{model: data.model, params: {t0: data.t0, z: data.z, amplitude: data.amplitude, x0: data.x0, x1: data.x1, c: data.c}}]);
            redis_pub.publish("modelFitForModelsPage", JSON.stringify({...data, ...phot[0]!}));
            //console.log(ee.emit('modelFit', {...data, ...phot[0]!}));
          }
          return {model: model, params: {
            amplitude: fit_model?.amplitude,
            x0: fit_model?.x0,
            x1: fit_model?.x1,
            c:  fit_model?.c,
            t0: fit_model!.t0,
            z:  fit_model!.z,
          }}
        }))
      ;
      revalidateTag("lasair2");
      return "Done";
    }),

    revalidate_models_for_transient: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (! await can_compute_transient(ctx.session)) return "Error: no Perm";
      revalidateTag("lasair2");
      return "Done";
    }),

    subLoadModelFitsForTransient: publicProcedure
    .input(z.object({ transient: z.string() }))
    .subscription(async function* (opts) {
      const { transient } = opts.input;
      // listen for new events
      console.log("Listening...");
      // const [relay, relay_push] = evtBucket<any>();
      // redis_sub.on("message", (channel: string, message: string) => {
      //   const ans = JSON.parse(message);
      //   console.log(`Received ${ans.transient} from ${channel}`);
      //   if (ans.transient === transient) relay_push(ans);
      // });
      // try {
      //   yield* relay;
      // }
      // finally {
        
      // }
      try {
        for await (const [channel, message] of on(redis_sub, "message")) {
          const ans = JSON.parse(message);
          console.log(`Received ${ans.transient} from ${channel}`);
          if (ans.transient === transient || ans.transient === KILLER_TRANSIENT) yield ans;
        }
      }
      finally {
        console.log('\x1b[105mWE CLOSEEEEEEEDDDDDD!!!!!!!!!!!!!!!!!!!!!!!\x1b[m')
      }
    }),
});

export async function can_compute_transient(session: Session) {
  let can_compute = false;
  if (session?.user) var perm_lvl = (await db.query.users.findFirst({where: (users, {eq}) => eq(users.id, session.user.id)}))?.perm;
  if (perm_lvl && perm_lvl >= CAN_COMPUTE_TRANSIENT) can_compute = true;
  return can_compute;
}