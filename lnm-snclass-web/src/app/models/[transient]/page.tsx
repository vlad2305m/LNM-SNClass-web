import { getServerAuthSession } from "~/server/auth";
import { get_db_models_and_phot, get_phot_data_for_graph } from "~/server/celery";
import { can_compute_transient } from "~/server/api/routers/post";
import { KILLER_TRANSIENT } from '~/lib/shared_constants';
import { ModelsClient } from "./client_page";
import { Travolta } from "~/app/not-found";

export default function Model({params}: {params: {transient: string | null}}) {
  const transient = params.transient;
  if (transient === KILLER_TRANSIENT) return "Reserved";
  if (transient === null) return <Travolta><h1>No transient name</h1></Travolta>;
  const phot_data = get_phot_data_for_graph(transient);
  const models_and_phot = get_db_models_and_phot(transient);


  const can_compute = (async () => {
    const session = await getServerAuthSession();
    return await can_compute_transient(session!);
  })();

  return <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-current">
    <ModelsClient can_compute={can_compute} phot={phot_data} models={models_and_phot} transient={transient}></ModelsClient>
  </main>;
}