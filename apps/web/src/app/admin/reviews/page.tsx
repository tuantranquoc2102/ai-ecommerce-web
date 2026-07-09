'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Loader2, MessageSquare, Star } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
  useToast,
} from '@ecom/ui';
import type { PaginatedReviews, ReviewStatus, ReviewView } from '@ecom/shared';
import { ApiError, apiFetch } from '@/lib/api-client';

const PAGE_SIZE = 20;

const REVIEW_STATUS_VALUES: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'];

const STATUS_VARIANT: Record<ReviewStatus, 'secondary' | 'success' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  APPROVED: 'success',
  REJECTED: 'destructive',
  HIDDEN: 'outline',
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < rating ? 'size-3.5 fill-primary text-primary' : 'size-3.5 text-muted-foreground/40'
          }
        />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ReviewView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'ALL'>('ALL');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');

  // Preview dialog.
  const [preview, setPreview] = useState<ReviewView | null>(null);
  // Reply dialog.
  const [replyTarget, setReplyTarget] = useState<ReviewView | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  // Moderation in-flight tracking.
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('pageSize', String(PAGE_SIZE));
      if (committedSearch) qs.set('search', committedSearch);
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);
      if (ratingFilter !== 'ALL') qs.set('rating', ratingFilter);
      const result = await apiFetch<PaginatedReviews>(`/reviews?${qs.toString()}`);
      setReviews(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
      setReviews([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, committedSearch, statusFilter, ratingFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function applySearch() {
    setCommittedSearch(search.trim());
    setPage(1);
  }

  async function moderate(review: ReviewView, status: ReviewStatus) {
    setModeratingId(review.id);
    try {
      await apiFetch<ReviewView>(`/reviews/${review.id}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast({ title: `Review → ${status}`, variant: 'success' });
      await load();
    } catch (e) {
      toast({
        title: 'Moderation failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setModeratingId(null);
    }
  }

  function openReply(review: ReviewView) {
    setReplyTarget(review);
    setReplyText(review.reply ?? '');
  }

  async function submitReply() {
    if (!replyTarget || !replyText.trim()) return;
    setReplying(true);
    try {
      await apiFetch<ReviewView>(`/reviews/${replyTarget.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      toast({ title: 'Reply saved', variant: 'success' });
      setReplyTarget(null);
      setReplyText('');
      await load();
    } catch (e) {
      toast({
        title: 'Reply failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setReplying(false);
    }
  }

  async function deleteReview(review: ReviewView) {
    try {
      await apiFetch<null>(`/reviews/${review.id}`, { method: 'DELETE' });
      toast({ title: 'Review deleted', variant: 'success' });
      await load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const columns: ColumnDef<ReviewView>[] = [
    {
      id: 'rating',
      header: 'Rating',
      cell: ({ row }) => <Stars rating={row.original.rating} />,
    },
    {
      id: 'product',
      header: 'Product',
      cell: ({ row }) =>
        row.original.product ? (
          <Link href="/admin/products" className="text-sm font-medium hover:underline">
            {row.original.product.title}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <span>{row.original.customerName ?? 'Guest'}</span>
          {row.original.isVerifiedPurchase ? (
            <Badge variant="success" className="text-[10px]">
              Verified
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const r = row.original;
        const busy = moderatingId === r.id;
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreview(r)}>
              View
            </Button>
            {r.status !== 'APPROVED' ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => moderate(r, 'APPROVED')}
              >
                Approve
              </Button>
            ) : null}
            {r.status !== 'REJECTED' ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => moderate(r, 'REJECTED')}
              >
                Reject
              </Button>
            ) : null}
            {r.status !== 'HIDDEN' ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => moderate(r, 'HIDDEN')}
              >
                Hide
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => openReply(r)}>
              Reply
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm" className="text-destructive">
                  Delete
                </Button>
              }
              title="Delete this review?"
              description="This review will be permanently removed. This cannot be undone."
              destructive
              confirmLabel="Delete"
              onConfirm={() => deleteReview(r)}
            />
          </div>
        );
      },
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Reviews" description="Moderate and reply to customer reviews." />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="grow min-w-[200px]">
          <Input
            placeholder="Search reviews"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch();
            }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as ReviewStatus | 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {REVIEW_STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={ratingFilter}
          onValueChange={(v) => {
            setRatingFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Any rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((r) => (
              <SelectItem key={r} value={String(r)}>
                {r} star{r === 1 ? '' : 's'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={applySearch} disabled={loading}>
          Search
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        columns={columns}
        data={reviews}
        loading={loading}
        pageSize={PAGE_SIZE}
        hidePagination
        empty={
          <EmptyState
            icon={<MessageSquare />}
            title="No reviews found"
            description="Try adjusting your filters."
          />
        }
      />

      <div className="mt-4 flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages} · {total} total
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={preview !== null} onOpenChange={(o) => (!o ? setPreview(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {preview ? <Stars rating={preview.rating} /> : null}
              {preview?.title ?? 'Review'}
            </DialogTitle>
            <DialogDescription>
              {preview?.customerName ?? 'Guest'}
              {preview?.isVerifiedPurchase ? ' · Verified purchase' : ''}
              {preview ? ` · ${new Date(preview.createdAt).toLocaleString()}` : ''}
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <div className="space-y-4">
              <p className="whitespace-pre-wrap text-sm">{preview.content}</p>
              {preview.reply ? (
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <MessageSquare className="size-3.5" /> Store reply
                    {preview.repliedAt ? (
                      <span>· {new Date(preview.repliedAt).toLocaleString()}</span>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{preview.reply}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (preview) openReply(preview);
                setPreview(null);
              }}
            >
              Reply
            </Button>
            <Button onClick={() => setPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply dialog */}
      <Dialog
        open={replyTarget !== null}
        onOpenChange={(o) => (!replying && !o ? setReplyTarget(null) : undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to review</DialogTitle>
            <DialogDescription>Your reply is shown publicly under the review.</DialogDescription>
          </DialogHeader>
          {replyTarget ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Stars rating={replyTarget.rating} />
                  <span className="text-xs text-muted-foreground">
                    {replyTarget.customerName ?? 'Guest'}
                  </span>
                </div>
                {replyTarget.title ? <div className="font-medium">{replyTarget.title}</div> : null}
                <p className="whitespace-pre-wrap text-muted-foreground">{replyTarget.content}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <Label htmlFor="reply-text">Reply</Label>
                <Textarea
                  id="reply-text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your response…"
                  rows={4}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyTarget(null)} disabled={replying}>
              Cancel
            </Button>
            <Button onClick={submitReply} disabled={replying || !replyText.trim()}>
              {replying ? <Loader2 className="size-4 animate-spin" /> : null}
              Save reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
