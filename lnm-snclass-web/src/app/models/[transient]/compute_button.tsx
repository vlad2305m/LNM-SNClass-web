"use client"

import { api } from "~/trpc/react";

export function ModelsComputeButton(props: {transient: string}) {
  const transient = props.transient;
  const { mutate, error } = api.post.compute_models_for_transient.useMutation();
  return <button className="rounded-full bg-teal-500/90 px-10 py-3 font-semibold no-underline transition hover:bg-teal-500/70 " 
        onClick={async () => mutate({ name: transient })}
      >Compute</button>
    ;
}

export function ModelsReloadButton(props: {transient: string}) {
  const transient = props.transient;
  const { mutate, error } = api.post.revalidate_models_for_transient.useMutation();
  return <button className="rounded-full bg-teal-500/90 px-3 py-3 font-semibold no-underline transition hover:bg-teal-500/70 " 
        onClick={async () => {mutate({ name: transient }); location.reload()}}
      >R</button>
    ;
}