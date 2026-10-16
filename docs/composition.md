# Compose an exploration

Build around a question the user needs to answer or a decision they need to make.
Choose the sequence of questions before choosing widgets. A focused answer may
need only a chart and a paragraph; add sections when they advance the investigation.

## Plan the analytical flow

State the main question, the population and period it covers, and what the user
should be able to understand or decide. Check that the available data supports
that purpose. Define the measures and comparisons before arranging the page.

Give each section a question that follows from the previous result. A useful
sequence is outcome, context, differences, and detail: what happened, when or
against what baseline, where it differs, and which records support the finding.
Adapt the sequence to the question; omit steps that add no useful evidence.

Give each element a job:

| Element   | Role in the exploration                                                                  |
| --------- | ---------------------------------------------------------------------------------------- |
| Metric    | Establish magnitude or change against a meaningful baseline.                             |
| Chart     | Reveal the pattern needed to answer a section's question.                                |
| Narrative | Frame the question, interpret evidence, qualify a claim, or suggest the next comparison. |
| Table     | Support exact comparisons, lookup, and inspection of supporting rows.                    |
| Filter    | Let the user test a relevant hypothesis or change the analytical scope.                  |

Remove repeated displays unless they support a different task. Use a widget's
`views` for alternate representations of the same dataset. Choose components
with the [visualization guide](widgets.md#choose-a-visualization).

## Turn the flow into a page

Lead with the question, visible scope, and strongest supported result. Keep
the title and instructions visible before data loads; derive findings from the
displayed result. When the evidence does not establish a clear change, say so.

Use `<Stack>` for the reading sequence and `<SectionHeading>` to introduce each
question. Use `<Grid>` for peer widgets that users should compare together;
give the main visual more space when it carries the section's answer. Preserve
the reading order when the grid collapses on a phone. See [layout](layout.md).

Place explanations beside the evidence they interpret. Use `<TextContent>` for
section introductions and `<TextWidget>` when commentary belongs in a panel.
Keep units, denominators, periods, and category definitions consistent across
related displays. Explain deliberate differences, such as a daily trend beside
a period total, or a channel breakdown beside the overall conversion rate.

Use app tabs for distinct analytical questions that need their own context.
Keep a short, connected investigation on one page so users can follow its evidence.
See [organize the exploration](app-authoring.md#organize-the-exploration).

## Make filters part of the investigation

Offer controls that help answer the question: a date range to locate a change,
a channel to test whether it is widespread, or a segment to compare populations.
Choose initial values that provide a useful starting point and enough observations
to interpret. Make each filter's scope clear and keep its placement consistent.

Related metrics, charts, and prose must describe the same displayed population.
Use common definitions and comparison periods; calculate an overall rate from
its numerator and denominator rather than averaging subgroup rates. Show counts
alongside rates when sample size affects interpretation. A changed population
mix can change the overall rate even when subgroup rates are stable.

Derive dynamic headlines and qualifications from the displayed result and its
input. A claim about all channels may stop being true after selecting one channel.
During refresh or failure, retain the scope belonging to the displayed result.
Explain empty selections without implying that an unavailable measure is zero.
See [variables](variables.md) and [displayed results](views.md#preserve-displayed-results).

## Example: where are we losing signups?

Suppose the inspected data records an ordered signup funnel and acquisition
channel. Define who enters the funnel, the completion window, and how channel
is attributed. Compare populations with equal opportunity to complete; exclude
or identify incomplete observations. Use these definitions throughout the app.

Compose the page in this reading order:

| Section                                | Composition                                                                           | Why it belongs                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| How many signup starters complete?     | Conversion metric with a comparable prior period, plus starter and completion counts. | Establish the outcome, denominator, and scale.                                |
| When does conversion change?           | Conversion trend with the same completion definition. Explain incomplete periods.     | Locate changes and distinguish a persistent pattern from a short fluctuation. |
| At which step, and for which channels? | Funnel followed by channel comparisons with counts and rates.                         | Locate drop-off and assess whether differences are broad or concentrated.     |
| What supports the comparison?          | Table of channel and step counts, denominators, and rates.                            | Let users check exact values and export the evidence.                         |

The date filter selects funnel entry dates; the channel filter affects every
section. Start with all channels and a period with adequate coverage. Introduce
the channel filter as a way to check whether the overall pattern also appears
within a channel. With one channel selected, compare its steps and periods;
do not keep an all-channel ranking claim in the headline.

Use one declared view for a coherent snapshot of these related datasets. Within
its content, use a `<Stack>` of section headings, short explanations, and bound
widgets. Place the outcome metrics in a `<Grid>`, give the trend its own row,
then show the funnel, channel comparison, and supporting table in reading order.
Reuse a dataset for its chart and table, and bind narrative to the same source.
See [views](views.md) and [datasets and metrics](widgets.md#declare-datasets-and-metrics).

## Distill the story

Choose one to four findings that answer the main question from the current
displayed result. Each finding needs a headline, a supporting visual, scope,
and registered evidence. Select the evidence needed to explain the result;
the story need not repeat every section.

For the signup example, a story might establish the conversion change, show
the step and channel where the difference is largest, and qualify the finding
with counts and coverage. Include those claims only when the selected data
supports them. Observed differences can suggest where to investigate; they do
not establish a cause or prove an intervention will work.

Reuse the exploration's bindings, definitions, and displayed snapshot in the
story and CSV export. See [stories and export](stories-and-export.md).

Before finishing, follow the page with the initial scope and a changed filter.
Check that each section advances the question, comparisons remain meaningful,
and the story agrees with the visible evidence. Verify the reading order and
context at phone width and during loading, empty, refresh, and error states.
