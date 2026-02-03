"use client";

import DOMPurify from "dompurify";

type RichTextDisplayProps = {
  html: string;
};

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
  "span",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

export function RichTextDisplay({ html }: RichTextDisplayProps) {
  if (!html || html === "<p></p>") return null;

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^https?:\/\//i,
  });

  return (
    <div
      className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-white/80 print:text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_a]:text-blue-300 print:[&_a]:text-blue-600 [&_strong]:font-semibold [&_em]:italic"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
