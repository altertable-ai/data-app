import type {
  AnnotationPoint,
  AnnotationRect,
} from '@/src/react/ui/annotation-targets';
import { Kbd } from '@/src/react/ui/Kbd';

export type AnnotationPin = {
  id: string;
  number: number;
  anchor: AnnotationPoint;
  rect: AnnotationRect;
};

type AnnotationMarkersProps = {
  outline?: AnnotationRect;
  rounded: boolean;
  pins: AnnotationPin[];
  pinsVisible: boolean;
  disabled: boolean;
  showHint: boolean;
  hasDuplicateIds: boolean;
  onOpenAnnotation: (id: string) => void;
};

export function AnnotationMarkers({
  outline,
  rounded,
  pins,
  pinsVisible,
  disabled,
  showHint,
  hasDuplicateIds,
  onOpenAnnotation,
}: AnnotationMarkersProps) {
  return (
    <>
      {outline && pinsVisible && (
        <div
          aria-hidden
          data-annotation-ui
          data-widget={rounded || undefined}
          className="altertable-annotation-outline"
          style={{
            left: outline.x,
            top: outline.y,
            width: outline.width,
            height: outline.height,
          }}
        />
      )}
      {pinsVisible &&
        pins.map(pin => (
          <button
            type="button"
            data-annotation-ui
            key={pin.id}
            disabled={disabled}
            onClick={() => onOpenAnnotation(pin.id)}
            className="altertable-annotation-pin"
            aria-label={`Annotation ${pin.number}`}
            style={{
              left: pin.rect.x + pin.rect.width * pin.anchor.x - 12,
              top: pin.rect.y + pin.rect.height * pin.anchor.y - 12,
            }}
          >
            {pin.number}
          </button>
        ))}
      {showHint && (
        <output data-annotation-ui className="altertable-annotation-hint">
          {hasDuplicateIds ? (
            'Some items cannot be annotated.'
          ) : (
            <>
              Point at an item or drag to select <Kbd>Esc</Kbd> to exit
            </>
          )}
        </output>
      )}
    </>
  );
}
