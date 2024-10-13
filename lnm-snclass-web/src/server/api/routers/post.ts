import 'server-only';
import { on } from 'events';
import type { Session } from "next-auth";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import Redis from "ioredis";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { get_db_or_fit_model, get_model_flux_for_graph } from "~/server/celery";
import { db } from "~/server/db";
import { CAN_COMPUTE_TRANSIENT } from "~/server/db/schema";
import { KILLER_TRANSIENT } from '~/lib/shared_constants';
import { models_list } from '~/components/snmodel-chart-model-to-type-map';
import type { Props } from "~/components/snmodel-chart";

const redis_pub = new Redis();
setInterval(() => void redis_pub.publish("modelFitForModelsPage", '{"transient":"'+KILLER_TRANSIENT+'"}'),  10 * 60 * 1000); // kill dangling connections to Redis
const redis_sub = new Redis();
redis_sub.subscribe("modelFitForModelsPage", (err, count: number) => {
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
        await Promise.all(models_list
        .map(async (model) => {
          const fit_model = await get_db_or_fit_model(input.name, model)
          if (fit_model.computed) {
            const data = fit_model;
            console.log("Flux "+data.model);
            const phot = await get_model_flux_for_graph([{model: data.model, params: {t0: data.t0, z: data.z, amplitude: data.amplitude, x0: data.x0, x1: data.x1, c: data.c}}]);
            console.log("Pub "+data.model);
            void redis_pub.publish("modelFitForModelsPage", JSON.stringify({...data, ...phot[0]!}));
          }
          return {model: model, params: {
            amplitude: fit_model?.amplitude,
            x0: fit_model?.x0,
            x1: fit_model?.x1,
            c:  fit_model?.c,
            t0: fit_model.t0,
            z:  fit_model.z,
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
        for await (const [channel, message] of on(redis_sub, "message") as AsyncIterableIterator<[string, string]>) {
          const ans = JSON.parse(message) as Props["model"];
          if (ans.transient !== KILLER_TRANSIENT) console.log(`Received ${ans.transient} from ${channel}`);
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
  if (session?.user) {
    const perm_lvl = (await db.query.users.findFirst({where: (users, {eq}) => eq(users.id, session.user.id)}))?.perm;
    if (perm_lvl && perm_lvl >= CAN_COMPUTE_TRANSIENT) can_compute = true;
  }
  return can_compute;
}