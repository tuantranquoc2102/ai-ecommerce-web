'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import {
  useFieldArray,
  useFormContext,
  useForm,
  FormProvider,
  type Control,
} from 'react-hook-form';
import { ArrowDown, ArrowUp, LayoutPanelTop, Plus, Trash2 } from 'lucide-react';
import {
  FOOTER_COLUMN_TYPES,
  FooterConfig,
  SOCIAL_PLATFORMS,
  type FooterColumnType,
} from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Switch,
  Textarea,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

const COLUMN_TYPE_LABELS: Record<FooterColumnType, string> = {
  links: 'Danh sách liên kết',
  text: 'Văn bản',
  contact: 'Thông tin liên hệ',
  social: 'Mạng xã hội',
  brand: 'Thương hiệu',
};

const SOCIAL_LABELS: Record<(typeof SOCIAL_PLATFORMS)[number], string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter / X',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  website: 'Website',
};

function makeColumn(type: FooterColumnType) {
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? `col-${Date.now()}-${Math.random()}`).slice(0, 64),
    type,
    title: type === 'contact' ? 'Get in touch' : '',
    links: [] as { label: string; url: string; target: '_self' | '_blank' }[],
    text: '',
    phone: '',
    email: '',
    address: '',
    socials: [] as { platform: (typeof SOCIAL_PLATFORMS)[number]; url: string }[],
    brandName: type === 'brand' ? 'Ecom' : '',
    brandTagline: '',
    showNewsletter: false,
    newsletterDiscountCode: '',
  };
}

export default function FooterSettingsPage() {
  const [initial, setInitial] = useState<FooterConfig | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<FooterConfig>('/settings/footer')
      .then(setInitial)
      .catch((e: Error) => setErr(e instanceof ApiError ? e.message : e.message));
  }, []);

  if (err) {
    return (
      <>
        <PageHeader title="Footer" description="Tuỳ chỉnh nội dung footer của cửa hàng." />
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      </>
    );
  }

  if (!initial) {
    return (
      <>
        <PageHeader title="Footer" description="Tuỳ chỉnh nội dung footer của cửa hàng." />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    );
  }

  return <FooterEditor initial={initial} />;
}

function FooterEditor({ initial }: { initial: FooterConfig }) {
  const { toast } = useToast();
  const form = useForm<FooterConfig>({
    resolver: zodResolver(FooterConfig),
    defaultValues: initial,
  });
  const { control, handleSubmit, formState } = form;
  const columns = useFieldArray({ control, name: 'columns' });

  async function onValid(values: FooterConfig) {
    try {
      const saved = await apiFetch<FooterConfig>('/settings/footer', {
        method: 'PUT',
        body: JSON.stringify(values),
      });
      form.reset(saved);
      toast({
        title: 'Đã lưu footer',
        description: 'Storefront sẽ cập nhật trong vòng ~60 giây.',
        variant: 'success',
      });
    } catch (e) {
      toast({
        title: 'Lưu thất bại',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  function onInvalid() {
    toast({
      title: 'Vui lòng kiểm tra lại',
      description: 'Một số trường chưa hợp lệ (thiếu nhãn hoặc URL).',
      variant: 'destructive',
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onValid, onInvalid)}>
        <PageHeader
          title="Footer"
          description="Tuỳ chỉnh số cột, nội dung từng cột, liên kết và mạng xã hội hiển thị ở footer."
          actions={
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          }
        />

        {/* Layout */}
        <Card className="mb-6 p-5">
          <h2 className="mb-4 text-sm font-semibold">Bố cục</h2>
          <FormField
            control={control}
            name="columnsPerRow"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Số cột mỗi hàng (desktop)</FormLabel>
                <FormControl>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} cột
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>

        {/* Columns */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Các cột ({columns.fields.length})</h2>
          <Select onValueChange={(v) => columns.append(makeColumn(v as FooterColumnType))}>
            <SelectTrigger className="w-auto gap-2">
              <Plus className="size-4" />
              <span>Thêm cột</span>
            </SelectTrigger>
            <SelectContent>
              {FOOTER_COLUMN_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {COLUMN_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {columns.fields.length === 0 ? (
          <Card className="mb-6 flex flex-col items-center gap-3 p-8 text-center">
            <LayoutPanelTop className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Chưa có cột nào. Nhấn “Thêm cột” để bắt đầu.
            </p>
          </Card>
        ) : (
          <div className="mb-6 space-y-4">
            {columns.fields.map((f, index) => (
              <ColumnCard
                key={f.id}
                control={control}
                index={index}
                total={columns.fields.length}
                onRemove={() => columns.remove(index)}
                onMoveUp={() => index > 0 && columns.move(index, index - 1)}
                onMoveDown={() =>
                  index < columns.fields.length - 1 && columns.move(index, index + 1)
                }
              />
            ))}
          </div>
        )}

        {/* Bottom bar */}
        <Card className="mb-6 p-5">
          <h2 className="mb-4 text-sm font-semibold">Thanh dưới cùng</h2>
          <FormField
            control={control}
            name="bottom.copyright"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Dòng bản quyền</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="© {year} Ecom. All rights reserved." />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Dùng <code>{'{year}'}</code> để tự động chèn năm hiện tại.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <LinkListEditor control={control} name="bottom.links" label="Liên kết dưới cùng" />
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

function ColumnCard({
  control,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  control: Control<FooterConfig>;
  index: number;
  total: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { watch } = useFormContext<FooterConfig>();
  const type = watch(`columns.${index}.type`);

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FormField
          control={control}
          name={`columns.${index}.type`}
          render={({ field }) => (
            <FormItem className="w-48">
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOTER_COLUMN_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {COLUMN_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Di chuyển lên"
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Di chuyển xuống"
            disabled={index === total - 1}
            onClick={onMoveDown}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Xoá cột"
            className="text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Title — hidden for brand columns (they use brand name instead). */}
      {type !== 'brand' ? (
        <FormField
          control={control}
          name={`columns.${index}.title`}
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Tiêu đề cột</FormLabel>
              <FormControl>
                <Input {...field} placeholder="VD: Cửa hàng, Hỗ trợ…" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {type === 'links' ? (
        <LinkListEditor control={control} name={`columns.${index}.links`} label="Liên kết" />
      ) : null}

      {type === 'text' ? (
        <FormField
          control={control}
          name={`columns.${index}.text`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nội dung</FormLabel>
              <FormControl>
                <Textarea rows={5} {...field} placeholder="Nhập nội dung văn bản…" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {type === 'contact' ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name={`columns.${index}.phone`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Điện thoại</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+84 900 000 000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`columns.${index}.email`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="hello@ecom.local" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={control}
            name={`columns.${index}.address`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Địa chỉ</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ho Chi Minh City, Vietnam" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <SocialListEditor control={control} name={`columns.${index}.socials`} />
        </div>
      ) : null}

      {type === 'social' ? (
        <SocialListEditor control={control} name={`columns.${index}.socials`} />
      ) : null}

      {type === 'brand' ? (
        <div className="space-y-4">
          <FormField
            control={control}
            name={`columns.${index}.brandName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên thương hiệu</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ecom" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`columns.${index}.brandTagline`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Khẩu hiệu</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} placeholder="Mô tả ngắn về thương hiệu…" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`columns.${index}.showNewsletter`}
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <FormLabel>Hiển thị form đăng ký nhận tin</FormLabel>
                  <p className="text-xs text-muted-foreground">Kèm ô nhập email + mã giảm giá.</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`columns.${index}.newsletterDiscountCode`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mã giảm giá cho người đăng ký</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="WELCOME10" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : null}
    </Card>
  );
}

function LinkListEditor({
  control,
  name,
  label,
}: {
  control: Control<FooterConfig>;
  name: `columns.${number}.links` | 'bottom.links';
  label: string;
}) {
  const arr = useFieldArray({ control, name });
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => arr.append({ label: '', url: '', target: '_self' })}
        >
          <Plus className="size-4" /> Thêm liên kết
        </Button>
      </div>
      {arr.fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">Chưa có liên kết nào.</p>
      ) : (
        <div className="space-y-2">
          {arr.fields.map((f, j) => (
            <div key={f.id} className="flex flex-wrap items-start gap-2">
              <FormField
                control={control}
                name={`${name}.${j}.label`}
                render={({ field }) => (
                  <FormItem className="min-w-[8rem] flex-1">
                    <FormControl>
                      <Input {...field} placeholder="Nhãn" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`${name}.${j}.url`}
                render={({ field }) => (
                  <FormItem className="min-w-[10rem] flex-[2]">
                    <FormControl>
                      <Input {...field} placeholder="/duong-dan hoặc https://…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`${name}.${j}.target`}
                render={({ field }) => (
                  <FormItem className="w-28">
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_self">Cùng tab</SelectItem>
                          <SelectItem value="_blank">Tab mới</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Xoá liên kết"
                className="text-destructive"
                onClick={() => arr.remove(j)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SocialListEditor({
  control,
  name,
}: {
  control: Control<FooterConfig>;
  name: `columns.${number}.socials`;
}) {
  const arr = useFieldArray({ control, name });
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Mạng xã hội</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => arr.append({ platform: 'facebook', url: '' })}
        >
          <Plus className="size-4" /> Thêm mạng xã hội
        </Button>
      </div>
      {arr.fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">Chưa có liên kết mạng xã hội nào.</p>
      ) : (
        <div className="space-y-2">
          {arr.fields.map((f, j) => (
            <div key={f.id} className="flex flex-wrap items-start gap-2">
              <FormField
                control={control}
                name={`${name}.${j}.platform`}
                render={({ field }) => (
                  <FormItem className="w-40">
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOCIAL_PLATFORMS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {SOCIAL_LABELS[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`${name}.${j}.url`}
                render={({ field }) => (
                  <FormItem className="min-w-[12rem] flex-1">
                    <FormControl>
                      <Input {...field} placeholder="https://…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Xoá"
                className="text-destructive"
                onClick={() => arr.remove(j)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
