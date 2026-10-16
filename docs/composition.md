# Compose an exploration

Start with the question the user needs to answer. Define its population, period,
measures, and comparison. Choose the analytical flow before choosing widgets;
a focused answer may need only a chart and a paragraph.

## Build a sequence of questions

Lead with the strongest supported result and visible scope. Give each section a
question that advances the investigation: what happened, when or against what
baseline, where it differs, and which details support the finding. Omit steps
that add no useful evidence.

Give each element a purpose:

| Element   | Purpose                                                                  |
| --------- | ------------------------------------------------------------------------ |
| Metric    | Establish magnitude or change.                                           |
| Chart     | Reveal the pattern that answers the section's question.                  |
| Narrative | Explain interpretation, qualify a claim, or suggest the next comparison. |
| Table     | Support exact comparisons and inspection.                                |
| Filter    | Test a relevant hypothesis or change the scope.                          |

Use `<Stack>` for reading order, `<SectionHeading>` for questions, and `<Grid>`
for peer widgets users should compare together. Give the main visual enough
space and preserve reading order on phones. Place explanations beside their
evidence, using `<TextContent>` for introductions or `<TextWidget>` for a panel.
See [layout](layout.md) and [widget selection](widgets.md#choose-a-visualization).

Keep a connected investigation on one page. Use app tabs for distinct analytical
questions and widget `views` for alternate representations of the same dataset.

## Make filters serve the question

Offer controls with a clear analytical use, such as dates to locate a change or
channels to test whether it is widespread. Choose useful defaults with adequate
coverage and make each filter's scope clear.

Keep related metrics, charts, and prose consistent in population, definitions,
units, and comparison periods. Explain deliberate differences. Show counts
alongside rates when sample size matters; calculate overall rates from their
numerators and denominators rather than averaging subgroup rates.

Derive findings and qualifications from the displayed result and its input.
A claim about all channels may no longer hold after selecting one. Retain the
displayed scope during refresh or failure. See [variables](variables.md) and
[displayed results](views.md#preserve-displayed-results).

## Example: where are we losing signups?

Define funnel entry, the completion window, and channel attribution. Compare
populations with equal opportunity to complete; identify incomplete observations.
Then compose the page in this order:

| Question                               | Display and purpose                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| How many starters complete?            | Conversion against a comparable prior period, with starter and completion counts to establish scale. |
| When does conversion change?           | Trend to locate the change, with incomplete periods identified.                                      |
| At which step, and for which channels? | Funnel and channel comparisons with counts and rates to locate differences.                          |
| What supports the comparison?          | Table of channel and step counts, denominators, and rates for inspection and export.                 |

Use one declared view for these related datasets. Put outcome metrics in a
`<Grid>`, give the trend its own row, then show the funnel, channel comparison,
and table. Reuse datasets for charts and tables, and bind narrative to the same
source. See [views](views.md) and [bindings](widgets.md#declare-datasets-and-metrics).

Let the date filter select funnel entry dates and the channel filter affect every
section. Start with all channels and adequate coverage. Selecting one channel
should help compare its steps and periods; update the headline to match that scope.

## Distill the story

Select one to four findings that answer the main question from the displayed
result. Reuse its bindings, scope, and evidence in the story and CSV export.
See [stories and export](stories-and-export.md).

For the signup example, present the conversion change, the step or channel where
the difference is largest, and any qualification about counts or coverage, when
supported. Observed differences suggest where to investigate; they do not
establish a cause.

Verify the initial scope and a changed filter: does each section advance the
question, and does the story agree with the visible evidence? Check reading order
and context on phones and through the [UI quality states](ui-quality.md).
