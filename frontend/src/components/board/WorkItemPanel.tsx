import { useEffect, useRef, useState } from "react";
import { X, Paperclip, Send, Trash2 } from "lucide-react";
import { RichTextEditor } from "../editor/RichTextEditor";
import { PriorityBadge, LabelChip, Avatar } from "../Badges";
import {
  useWorkItem, useUpdateWorkItem, useUploadAttachment, useCreateComment,
  useStates, useDeleteWorkItem, useCycles,
} from "../../api/resources";
import type { Priority, ItemType } from "../../types";
import { formatDistanceToNow } from "date-fns";

const fieldSelectClass =
  "w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export function WorkItemPanel({ itemId, projectId, onClose }: { itemId: string; projectId: string; onClose: () => void }) {
  const { data: item } = useWorkItem(itemId);
  const { data: states } = useStates(projectId);
  const { data: cycles } = useCycles(projectId);
  const updateItem = useUpdateWorkItem();
  const uploadAttachment = useUploadAttachment();
  const createComment = useCreateComment();
  const deleteItem = useDeleteWorkItem();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentDraft, setCommentDraft] = useState({ json: {}, html: "" });
  const [title, setTitle] = useState(item?.title ?? "");

  useEffect(() => setTitle(item?.title ?? ""), [item?.id]);

  if (!item) return null;

  function saveTitle() {
    if (title.trim() && title !== item!.title) {
      updateItem.mutate({ id: item!.id, payload: { title } });
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadAttachment.mutate({ workItemId: item!.id, file });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function submitComment() {
    if (!commentDraft.html || commentDraft.html === "<p></p>") return;
    createComment.mutate({ work_item: item!.id, body: commentDraft.json, body_html: commentDraft.html });
    setCommentDraft({ json: {}, html: "" });
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/20 dark:bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <span className="text-sm font-medium text-slate-400 dark:text-slate-500">{item.identifier}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (confirm("Delete this work item?")) {
                  deleteItem.mutate(item.id);
                  onClose();
                }
              }}
              className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            className="w-full border-none bg-transparent text-xl font-semibold text-slate-900 outline-none dark:text-white"
          />

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
            <Field label="Status">
              <select
                value={item.state}
                onChange={(e) => updateItem.mutate({ id: item.id, payload: { state: e.target.value } })}
                className={fieldSelectClass}
              >
                {states?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={item.priority}
                onChange={(e) => updateItem.mutate({ id: item.id, payload: { priority: e.target.value as Priority } })}
                className={fieldSelectClass}
              >
                {["none", "low", "medium", "high", "urgent"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <select
                value={item.item_type}
                onChange={(e) => updateItem.mutate({ id: item.id, payload: { item_type: e.target.value as ItemType } })}
                className={fieldSelectClass}
              >
                {["task", "bug", "story", "epic"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Story points">
              <input
                type="number"
                min={0}
                defaultValue={item.story_points}
                onBlur={(e) => updateItem.mutate({ id: item.id, payload: { story_points: Number(e.target.value) } })}
                className={fieldSelectClass}
              />
            </Field>
            <Field label="Due date">
              <input
                type="date"
                defaultValue={item.due_date ?? ""}
                onBlur={(e) => updateItem.mutate({ id: item.id, payload: { due_date: e.target.value || null } })}
                className={fieldSelectClass}
              />
            </Field>
            <Field label="Cycle">
              <select
                value={item.cycle ?? ""}
                onChange={(e) => updateItem.mutate({ id: item.id, payload: { cycle: e.target.value || null } })}
                className={fieldSelectClass}
              >
                <option value="">No cycle</option>
                {cycles?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <PriorityBadge priority={item.priority} />
            {item.labels.map((l) => <LabelChip key={l.id} name={l.name} color={l.color} />)}
          </div>

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Description</h3>
            <RichTextEditor
              content={item.description}
              onChange={(json, html) => updateItem.mutate({ id: item.id, payload: { description: json, description_html: html } })}
              placeholder="Add a description..."
            />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Attachments</h3>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                <Paperclip size={13} /> Add file
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>
            <div className="space-y-1.5">
              {item.attachments?.map((a) => (
                <a
                  key={a.id}
                  href={a.file}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Paperclip size={13} className="text-slate-400" />
                  <span className="truncate">{a.file_name}</span>
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{Math.round(a.file_size / 1024)} KB</span>
                </a>
              ))}
              {(!item.attachments || item.attachments.length === 0) && (
                <p className="text-xs text-slate-400 dark:text-slate-500">No attachments yet.</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Comments</h3>
            <div className="space-y-3">
              {item.comments?.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar user={c.author} size={26} />
                  <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.author?.username}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatDistanceToNow(new Date(c.created_at))} ago</span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert mt-1 max-w-none" dangerouslySetInnerHTML={{ __html: c.body_html }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-start gap-2">
              <div className="flex-1">
                <RichTextEditor
                  content={commentDraft.json}
                  onChange={(json, html) => setCommentDraft({ json, html })}
                  placeholder="Write a comment..."
                  minimal
                />
              </div>
              <button onClick={submitComment} className="mt-1 rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-700">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      {children}
    </div>
  );
}
