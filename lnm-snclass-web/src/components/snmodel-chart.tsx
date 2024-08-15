"use client"

import { CartesianGrid, Cell, ComposedChart, ErrorBar, Line, LineChart, Scatter, XAxis, YAxis } from "recharts"
import moment from 'moment'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart"

import { type_dict } from "./snmodel-chart-model-to-type-map"

const chartConfig = {
  // model: {
  //   label: "Model",
  //   color: "hsl(var(--chart-1))",
  // },
  // phot: {
  //   label: "Photometry",
  //   color: "hsl(var(--chart-2))",
  // },
} satisfies ChartConfig

export type Props = {
  phot: {time: number, band: string, flux: number, flux_err: number}[],
  model: {model: string;
    bands: string[];
    data: {
        time: number;
        ztfr?: number;
        ztfg?: number;
    }[];
    id: number;
    createdAt: Date;
    updatedAt: Date | null;
    transient: string;
    logl: number;
    logz_err: number;
    time_spent: string;},
}
export function SNModelChartComponent(props: Props) {
  let ymin=props.phot[0]!.flux, ymax=props.phot[0]!.flux, xmin=Math.floor(props.phot[0]!.time), xmax=Math.ceil(props.phot[0]!.time);
  for (const p of props.phot) {
    ymin=Math.min(ymin, p.flux); ymax=Math.max(ymax, p.flux);
    xmin=Math.min(xmin, Math.floor(p.time)); xmax=Math.max(xmax, Math.ceil(p.time));
  }
  const yd = (ymax-ymin)*0.02;
  ymax+=yd; ymin-=yd;
  const cardpad = "p-3";
  return (
    <Card>
      <CardHeader className={cardpad}>
        <CardTitle className="w-full flex justify-center ">{props.model.model}</CardTitle>
        <CardDescription className="w-full flex justify-center ">{type_dict[props.model.model]}</CardDescription>
      </CardHeader>
      <CardContent className={cardpad}>
        <ChartContainer config={chartConfig} className="w-full">
          <ComposedChart
            accessibilityLayer
            data={props.model.data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={[xmin, xmax]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              //tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              width={40}
              dataKey="flux"
              domain={[ymin, ymax]}
              tickLine={false}
              axisLine={false}
              //tickMargin={8}
              tickFormatter={(value) => value.toFixed(2)}
            />
            {/* <ChartTooltip cursor={false} content={<ChartTooltipContent />} /> */}
            <Scatter
              data={props.phot}
              //type="monotone"
              fill="var(--color-phot)"
              //strokeWidth={2}
              //dot={false}
              isAnimationActive={false}
            >
              <ErrorBar dataKey="flux_err" width={4} strokeWidth={2} stroke="green" direction="y" />
              {props.phot.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.band == "ztfr" ? "red" : entry.band == "ztfg" ? "green" : "var(--color-desktop)"} />
              ))}
            </Scatter>
            {props.model.bands.map((band: string) => <Line
              key={props.model.model+band}
              dataKey={band}
              type="monotone"
              stroke={band == "ztfr" ? "red" : band == "ztfg" ? "green" :  "var(--color-model)"}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />)}
          </ComposedChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className={cardpad}>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none w-60">
              logl={props.model.logl} +- {props.model.logz_err}
            </div>
            {props.model.updatedAt && <div className="flex items-center leading-none text-muted-foreground">
              Computed&nbsp;<span title={moment(props.model.updatedAt).format("ddd, MMM Do YYYY, h:mm:ss a")}>{moment(props.model.updatedAt).fromNow()}</span>
            </div>}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
