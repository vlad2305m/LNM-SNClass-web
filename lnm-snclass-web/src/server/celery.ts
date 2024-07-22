import * as Celery from "celery-ts";

export const celery_client: Celery.Client = Celery.createClient({
    brokerUrl: "redis://localhost",
    resultBackend: "redis://localhost",
});

const add_task = celery_client.createTask<number>("tasks.add");
// export function celery_add(a: number, b: number) {
//     return add_task.applyAsync({
//         args: [a, b],
//         kwargs: { },
//         compression: Celery.Compressor.Zlib,
//     }).get();
// }

export function celery_exec(t: string, args: Array<any>, kwargs: object = {}) {
    const tt = celery_client.createTask<any>(t+"").applyAsync({
        args: args,
        kwargs: kwargs,
        compression: Celery.Compressor.Zlib,
    })
    return tt.get();
}
