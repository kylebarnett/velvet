"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
} from "lucide-react";

type RichTextEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function RichTextEditor({
  content,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "underline text-blue-300" },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "Start typing..." }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[80px] w-full rounded-b-md border border-t-0 border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/20 prose prose-invert prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_a]:text-blue-300",
      },
    },
  });

  if (!editor) return null;

  function toggleLink() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("URL");
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        window.alert("Only http and https links are allowed.");
        return;
      }
      editor.chain().focus().setLink({ href: url }).run();
    } catch {
      window.alert("Please enter a valid URL (e.g. https://example.com).");
    }
  }

  const btnClass = (active: boolean) =>
    `rounded p-1.5 transition-colors ${
      active
        ? "bg-white/15 text-white"
        : "text-white/50 hover:bg-white/10 hover:text-white/70"
    }`;

  return (
    <div>
      <div className="flex items-center gap-0.5 rounded-t-md border border-white/10 bg-black/20 px-1 py-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive("bold"))}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive("italic"))}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive("bulletList"))}
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive("orderedList"))}
          title="Ordered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={toggleLink}
          className={btnClass(editor.isActive("link"))}
          title="Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
