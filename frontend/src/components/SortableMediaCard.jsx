import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import MediaCard from "@/components/MediaCard";

/**
 * Wraps MediaCard with dnd-kit sortable. The whole card is the drag handle;
 * a PointerSensor with `distance: 8` activation makes a tap-then-release act
 * as a normal click (so the player still opens cleanly).
 */
export default function SortableMediaCard({
  media,
  accentColor,
  index,
  onClick,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: media.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 1,
    cursor: isDragging ? "grabbing" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`sortable-media-${media.id}`}
      className={isDragging ? "opacity-80 scale-[1.02] transition-transform" : ""}
    >
      <MediaCard
        media={media}
        accentColor={accentColor}
        index={index}
        onClick={onClick}
      />
    </div>
  );
}
