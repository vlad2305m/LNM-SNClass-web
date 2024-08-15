import { getServerAuthSession } from "~/server/auth";
import { get_db_models_and_phot, get_phot_data_for_graph } from "~/server/celery";
import { can_compute_transient } from "~/server/api/routers/post";
import { KILLER_TRANSIENT } from '~/lib/shared_constants';
import { ModelsClient } from "./client_page";
import { Travolta } from "~/app/not-found";
import { Suspense } from "react";

export default async function Model({params}: {params: {transient: string | null}}) {
  const transient = params.transient;
  if (transient === KILLER_TRANSIENT) return "Reserved";
  if (transient === null) return <Travolta><h1>No transient name</h1></Travolta>;
  const phot_data = await get_phot_data_for_graph(transient);
  const models_and_phot = await get_db_models_and_phot(transient);
  if (models_and_phot.error) return <Travolta><h1>{models_and_phot.error}</h1></Travolta>;


  const session = await getServerAuthSession();
  const can_compute = await can_compute_transient(session!);


  return <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-current">
    <Suspense fallback="Loading...">
      <ModelsClient can_compute={can_compute} phot={phot_data} models={models_and_phot.models!} transient={transient}></ModelsClient>
    </Suspense>
  </main>;
}