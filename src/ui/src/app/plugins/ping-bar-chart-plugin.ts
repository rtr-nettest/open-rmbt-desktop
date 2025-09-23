import { Chart } from "chart.js"

export const BAR_WIDTH = 20
export const getBarWidth = (data: any[]) => BAR_WIDTH * (10 / data.length)

export class PingBarChartPlugin {
  // Starts drawing the bars from the left edge of the first bar
  // and ends them at the right edge of the last bar
  beforeDatasetsDraw(chart: Chart): boolean | void {
    const {
      chartArea: { left, width },
    } = chart
    const { data } = chart.getDatasetMeta(0)
    const barWidth = getBarWidth(data)
    for (const [i, dp] of data.entries()) {
      const gap = ((width - barWidth) / (data.length - 1)) * i
      dp.x = left + barWidth / 2 + gap
    }
  }
}
