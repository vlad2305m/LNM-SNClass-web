"use client"

import { api } from "~/trpc/react";
import { Props } from "~/components/snmodel-chart";
import { useState } from "react";

import { SNModelChartComponent } from "~/components/snmodel-chart";
import { type_dict } from "~/components/snmodel-chart-model-to-type-map";
import { ModelsComputeButton, ModelsReloadButton } from "./compute_button";
import { KILLER_TRANSIENT } from '~/lib/shared_constants';

export function ModelsClient(props: {transient: string, phot: Props["phot"], models: Props["model"][], can_compute: boolean}) {
  const transient = props.transient;
  const phot_data = props.phot;
  const [sorted_models , set_sorted_models] = useState(props.models.sort((a,b) => b.logl - a.logl));
  api.post.subLoadModelFitsForTransient.useSubscription( { transient },
    { onData(model) {
      if (model.transient !== KILLER_TRANSIENT) set_sorted_models([...sorted_models, model].sort((a,b) => b.logl - a.logl));
    },},
  );
  //const { mutate, error } = api.post.compute_models_for_transient.useMutation();
  return <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
  <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
    {transient}
  </h1>
  <div>
    Total: {sorted_models.length} models, predicted: {type_dict[sorted_models[0]?.model!]},&nbsp;
    <a className="underline text-blue-600" href={"https://lasair-ztf.lsst.ac.uk/objects/"+transient+"/"}>Lasair</a>
  </div>
  {props.can_compute && <div className="flex flex-row gap-1">
      <ModelsComputeButton transient={transient}></ModelsComputeButton>
      <ModelsReloadButton transient={transient}></ModelsReloadButton>
    </div>}
  <div className="flex flex-row flex-wrap justify-center">
      {sorted_models.slice(0,15).map((model) => <SNModelChartComponent phot={phot_data} model={model} key={model.model}></SNModelChartComponent>)}
  </div>
</div>;
}