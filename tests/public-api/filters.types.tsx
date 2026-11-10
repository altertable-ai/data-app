import {
  ChoicePicker,
  RadioGroup,
  Radio,
  CheckboxGroup,
  Checkbox,
  NumberFilterPicker,
  NumberField,
  NumberRangeField,
  Select,
  SegmentedControl,
  FilterActions,
} from '@altertable/data-app-react/ui';
import {
  booleanFilter,
  choiceFilter,
  multiChoiceFilter,
  numberFilter,
  searchFilter,
  type FilterPresentation,
} from '@altertable/data-app/contract';
const options = [{ id: 'a', label: 'Alpha' }];
const presentation: FilterPresentation = {
  control: 'widget',
  prominence: 'secondary',
};
// @ts-expect-error Display options are declared with displayChoice, not a presentation group.
const invalidGroup: FilterPresentation = { group: 'display' };
// @ts-expect-error Prominence is primary or secondary.
const invalidProminence: FilterPresentation = { prominence: 'hidden' };
void [presentation, invalidGroup, invalidProminence];
const controls = (
  <>
    <ChoicePicker
      label="Single"
      selectionMode="single"
      value="a"
      options={options}
      onChange={() => {}}
    />
    <ChoicePicker
      label="Multiple"
      selectionMode="multiple"
      values={[]}
      options={options}
      maxSelected={1}
      emptySelectionLabel="None"
      onChange={() => {}}
    />
    <Select label="Choice" options={options} value="a" onChange={() => {}} />
    <RadioGroup label="Radio" value="a" onChange={() => {}}>
      <Radio value="a">Alpha</Radio>
    </RadioGroup>
    <CheckboxGroup label="Checkboxes" values={[]} onChange={() => {}}>
      <Checkbox label="Alpha" value="a" />
    </CheckboxGroup>
    <SegmentedControl
      label="Segments"
      value="a"
      options={options}
      onChange={() => {}}
    />
    <NumberFilterPicker
      filter={numberFilter({ key: 'amount', label: 'Amount' })}
      value={{ kind: 'all' }}
      onChange={() => {}}
    />
    <NumberField label="Value" value={null} onChange={() => {}} />
    <NumberRangeField label="Range" value={{}} onChange={() => {}} />
    <FilterActions onApply={() => {}} onCancel={() => {}} />
  </>
);
const missingMode = (
  // @ts-expect-error Cardinality must be explicit.
  <ChoicePicker
    label="Missing"
    value="a"
    options={options}
    onChange={() => {}}
  />
);
const mixedMode = (
  // @ts-expect-error Single choices cannot receive a collection of values.
  <ChoicePicker
    label="Mixed"
    selectionMode="single"
    values={[]}
    options={options}
    onChange={() => {}}
  />
);
// @ts-expect-error Choices require labeled options.
choiceFilter({ key: 'choice', defaultValue: 'a' });
// @ts-expect-error Apply and Cancel form one draft interaction.
const incompleteDraft = <FilterActions onApply={() => {}} />;
void [
  controls,
  missingMode,
  mixedMode,
  incompleteDraft,
  choiceFilter({ key: 'choice', options, defaultValue: 'a' }),
  multiChoiceFilter({ key: 'tags', options }),
  searchFilter({ key: 'q' }),
  numberFilter({ key: 'amount', label: 'Amount' }),
  booleanFilter({ key: 'active', label: 'Active' }),
];
