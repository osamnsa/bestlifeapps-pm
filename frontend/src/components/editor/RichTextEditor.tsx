import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";
import {
  Bold, Italic, List, ListOrdered, Heading2, Quote, Code, Link as LinkIcon,
} from "lucide-react";
import clsx from "clsx";

interface RichTextEditorProps {
  content?: any;
  onChange: (json: any, html: string) => void;
  placeholder?: string;
  editable?: boolean;
  minimal?: boolean;
}

export function RichTextEditor({
  content, onChange, placeholder = "Write something...", editable = true, minimal = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
    ],
    content: content && Object.keys(content).length ? content : "",
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON(), editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return null;

  return (
    <div className={clsx("tiptap-editor", !minimal && "rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800")}>
      {editable && (
        <div className="flex items-center gap-1 border-b border-slate-100 px-2 py-1.5 dark:border-slate-700">
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
            <Bold size={15} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
            <Italic size={15} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
            <Heading2 size={15} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
            <List size={15} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
            <ListOrdered size={15} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
            <Quote size={15} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}>
            <Code size={15} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => {
              const url = window.prompt("URL");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            active={editor.isActive("link")}
          >
            <LinkIcon size={15} />
          </ToolbarBtn>
        </div>
      )}
      <div className="px-3 py-2 prose prose-sm dark:prose-invert max-w-none prose-slate">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white",
        active && "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300"
      )}
    >
      {children}
    </button>
  );
}
