import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarChart, LineChart } from "./charts";

describe("sparse charts", () => {
  it("renders one line-chart reading with a full-width observation guide", () => {
    const markup = renderToStaticMarkup(<LineChart points={[175.9]} labels={["Aug 8"]} />);

    expect(markup).toContain('stroke-dasharray="5 6"');
    expect(markup).toContain("175.9");
    expect(markup).toContain("Aug 8");
  });

  it("renders two readings as a connected line with area fill", () => {
    const markup = renderToStaticMarkup(<LineChart points={[175.9, 174.8]} labels={["Aug 8", "Aug 9"]} />);

    expect(markup).not.toContain('stroke-dasharray="5 6"');
    expect(markup).toMatch(/<path d="M[^\"]+ L[^\"]+" fill="none"/);
    expect(markup).toMatch(/fill="url\(#a/);
  });

  it("centers the plot when the separate last-value label is hidden", () => {
    const markup = renderToStaticMarkup(
      <LineChart points={[175.9, 174.8]} labels={["Aug 8", "Aug 9"]} showLastValue={false} />
    );

    expect(markup).toContain('x="10" y="16" width="300"');
  });

  it("uses substantial bar widths for one or two values", () => {
    const single = renderToStaticMarkup(<BarChart values={[1200]} labels={["W1"]} />);
    const pair = renderToStaticMarkup(<BarChart values={[1200, 1450]} labels={["W1", "W2"]} />);

    expect(single).toContain('width="72"');
    expect(pair).toContain('width="54"');
  });
});
