export default function Custom404() {
  return <Travolta><h1 className="p-5">404 - Page Not Found</h1></Travolta>;
}

export function Travolta({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex flex-col justify-evenly items-center h-screen">
    <div className="p-5">{children}</div>
    <img alt="Confused Travolta" loading="lazy" width="768" height="326" decoding="async" data-nimg="1" className="mx-auto rounded-md" src="https://authjs.dev/_next/static/media/confused-travolta.2cb7b484.gif"></img>
  </div>;
}