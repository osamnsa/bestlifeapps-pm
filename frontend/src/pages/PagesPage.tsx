import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { usePages, usePage, useCreatePage, useUpdatePage, useDeletePage } from "../api/resources";
import { RichTextEditor } from "../components/editor/RichTextEditor";
import { formatDistanceToNow } from "date-fns";

export function PagesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: pages } = usePages(projectId);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const createPage = useCreatePage();
  const deletePage = useDeletePage();

  useEffect(() => {
    if (!selectedId && pages && pages.length > 0) setSelectedId(pages[0].id);
  }, [pages, selectedId]);

  if (!projectId) return null;

  function handleCreate() {
    createPage.mutate(
      { project: projectId, title: "Untitled" },
      { onSuccess: (page) => setSelectedId(page.id) }
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-64 shrink-0 border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Pages</span>
          <button onClick={handleCreate} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <Plus size={15} />
          </button>
        </div>
        <div className="space-y-0.5">
          {pages?.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm ${
                selectedId === p.id
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span>{p.icon || "📄"}</span>
              <span className="flex-1 truncate">{p.title || "Untitled"}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this page?")) {
                    deletePage.mutate(p.id);
                    if (selectedId === p.id) setSelectedId(undefined);
                  }
                }}
                className="hidden text-slate-300 hover:text-red-500 group-hover:block dark:text-slate-600 dark:hover:text-red-400"
              >
                <Trash2 size={13} />
              </span>
            </button>
          ))}
          {(!pages || pages.length === 0) && (
            <p className="px-2 py-4 text-xs text-slate-400 dark:text-slate-500">No pages yet. Create your team's first doc.</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedId ? (
          <PageEditor pageId={selectedId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-slate-300 dark:text-slate-700">
            <FileText size={40} />
            <p className="mt-2 text-sm">Select or create a page</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PageEditor({ pageId }: { pageId: string }) {
  const { data: page } = usePage(pageId);
  const updatePage = useUpdatePage();
  const [title, setTitle] = useState(page?.title ?? "");

  useEffect(() => setTitle(page?.title ?? ""), [page?.id]);

  if (!page) return null;

  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title !== page.title && updatePage.mutate({ id: page.id, payload: { title } })}
        placeholder="Untitled"
        className="mb-1 w-full border-none bg-transparent text-3xl font-bold text-slate-900 outline-none dark:text-white"
      />
      <p className="mb-6 text-xs text-slate-400 dark:text-slate-500">
        Last updated {formatDistanceToNow(new Date(page.updated_at))} ago by {page.created_by?.username ?? "unknown"}
      </p>
      <RichTextEditor
        content={page.content}
        onChange={(json, html) => updatePage.mutate({ id: page.id, payload: { content: json, content_html: html } })}
        placeholder="Start writing your documentation..."
      />
    </div>
  );
}
