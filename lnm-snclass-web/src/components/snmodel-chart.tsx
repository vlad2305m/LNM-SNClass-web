"use client"

import { TrendingUp } from "lucide-react"
import { CartesianGrid, ComposedChart, ErrorBar, Line, LineChart, Scatter, XAxis, YAxis } from "recharts"

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
const chartData = [
  { time: 60061, desktop: 186, mobile: 0.1 },
  { time: 60062, desktop: 305, mobile: 0.2 },
  { time: 60063, desktop: 237, mobile: 0.13 },
  { time: 60064, desktop: 73, mobile: 0.14 },
  { time: 60065, desktop: 209, mobile: 0.16 },
  { time: 60066, desktop: 214, mobile: 0.1 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

type Props = {
  phot: {time: number[], band: string[], flux: number[], flux_err: number[]},
}
export function SNModelChartComponent(props: Props) {
  const photData: {time: number, band: string, flux: number, flux_err: number}[] = Array(props.phot.time.length);
  const photDataT: any = props.phot;
  for(let i = 0; i<photDataT.time.length; i++) {
    photData[i] = {time: photDataT.time[i], band: photDataT.band[i], flux: photDataT.flux[i], flux_err: photDataT.flux_err[i]};
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Line Chart - Multiple</CardTitle>
        {/* <CardDescription>January - June 2024</CardDescription> */}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full">
          <ComposedChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={([dataMin, dataMax]) => [Math.floor(dataMin), Math.ceil(dataMax)]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              //tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              width={40}
              dataKey="flux"
              tickLine={false}
              axisLine={false}
              //tickMargin={8}
            />
            {/* <ChartTooltip cursor={false} content={<ChartTooltipContent />} /> */}
            <Line
              data={chartData.slice(2, 6)}
              dataKey="mobile"
              type="monotone"
              stroke="var(--color-mobile)"
              strokeWidth={2}
              dot={false}
            />
            <Scatter
              data={photData}
              //type="monotone"
              //stroke="var(--color-desktop)"
              //strokeWidth={2}
              //dot={false}
            >
              <ErrorBar dataKey="flux_err" width={4} strokeWidth={2} stroke="green" direction="y" />
            </Scatter>
          </ComposedChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              Trending up by 5.2% this month
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              Showing total visitors for the last 6 months
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
