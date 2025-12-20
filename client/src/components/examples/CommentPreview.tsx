import CommentPreview from '../CommentPreview';

const mockComments = [
  { id: 1, text: "This is absolutely incredible! The attention to detail is amazing", category: "positive" },
  { id: 2, text: "Okay but why is this so good though?", category: "playful" },
  { id: 3, text: "Everyone else can go home now", category: "sassy" },
];

export default function CommentPreviewExample() {
  return (
    <div className="h-80 w-80">
      <CommentPreview
        comments={mockComments}
        onRefresh={() => console.log("refresh")}
      />
    </div>
  );
}
