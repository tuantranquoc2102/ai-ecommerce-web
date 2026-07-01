# Component Guide

Reference for every primitive exported from `@ecom/ui`. All components are imported from the barrel:

```tsx
import { Button, Input, Dialog, /* ... */ } from '@ecom/ui';
```

Optional subpath imports also work for tree-shaking:

```tsx
import { Button } from '@ecom/ui/components/button';
```

---

## Primitives

### Button

```tsx
<Button variant="default" size="default" onClick={...}>Save</Button>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'` | `default` | Visual style |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `default` | Height & padding |
| `asChild` | `boolean` | `false` | Render as the immediate child (for `<Link>` etc.) |

**When to use each variant:**
- `default` — the ONE primary action per view
- `destructive` — delete / remove / dangerous
- `outline` — secondary action
- `secondary` — tertiary / low-emphasis
- `ghost` — icon-only buttons in toolbars, table row actions
- `link` — inline navigation-like buttons

**Example with icon:**
```tsx
<Button>
  <PlusIcon /> New product
</Button>
```

**As-child pattern for Next Link:**
```tsx
<Button asChild>
  <Link href="/admin/products/new">New product</Link>
</Button>
```

### Input

Standard text input. Extends all HTML `<input>` attrs. Automatically shows a destructive ring when `aria-invalid="true"` (which `<FormControl>` sets on validation error).

```tsx
<Input type="email" placeholder="you@example.com" />
```

### Textarea

Multi-line variant of Input. Same styling rules.

### Label

Semantic label for form controls. Prefer `<FormLabel>` inside forms; use raw `<Label>` only outside `react-hook-form`.

### Checkbox, Switch

Radix-backed boolean controls. Both support `checked` / `defaultChecked` / `onCheckedChange`.

```tsx
<div className="flex items-center gap-2">
  <Switch id="notif" defaultChecked />
  <Label htmlFor="notif">Enable notifications</Label>
</div>
```

### Select, SelectTrigger, SelectContent, SelectItem, …

Full Radix Select. Usage:

```tsx
<Select value={role} onValueChange={setRole}>
  <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="admin">Admin</SelectItem>
    <SelectItem value="editor">Editor</SelectItem>
  </SelectContent>
</Select>
```

### Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter

Grouped content surface. Compose:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Statistics</CardTitle>
    <CardDescription>Last 7 days</CardDescription>
  </CardHeader>
  <CardContent>{content}</CardContent>
</Card>
```

### Badge

Inline pill for status, category tags. Variants: `default | secondary | destructive | success | warning | outline`.

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="destructive">Blocked</Badge>
```

### Separator

Horizontal or vertical divider.

```tsx
<Separator />                 // horizontal (h-px)
<Separator orientation="vertical" className="h-6" />
```

### Alert, AlertTitle, AlertDescription

Blocking / high-attention message. Variants: `default | destructive | warning | success`.

```tsx
<Alert variant="destructive">
  <AlertTitle>Save failed</AlertTitle>
  <AlertDescription>Check your network connection.</AlertDescription>
</Alert>
```

---

## Overlays

### Dialog (modal for tasks)

Standard modal. Use for **stateful forms** or **details**. For confirmation prompts, use `<AlertDialog>` or `<ConfirmDialog>` pattern instead.

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild><Button>Edit</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit product</DialogTitle>
      <DialogDescription>Change name and price.</DialogDescription>
    </DialogHeader>
    <form>…</form>
    <DialogFooter>
      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
      <Button type="submit">Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### AlertDialog (confirm/warn)

Use for actions that need explicit acknowledgement (delete, publish, ban). Prefer the `<ConfirmDialog>` pattern below for the common case.

### Sheet (side drawer)

Slide-in panel from any edge. Use for **complex forms** where a modal would feel small, and on **mobile** where dialogs are cramped.

```tsx
<Sheet>
  <SheetTrigger asChild><Button>Filters</Button></SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Filters</SheetTitle>
      <SheetDescription>Narrow the product list.</SheetDescription>
    </SheetHeader>
    {/* body */}
  </SheetContent>
</Sheet>
```

### DropdownMenu

Contextual menu. Common for user avatars, row-actions, "more" buttons.

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><EllipsisIcon /></Button></DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={edit}>Edit</DropdownMenuItem>
    <DropdownMenuItem onClick={del} className="text-destructive">Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Tooltip

Wrap the app in `<TooltipProvider>` once at root, then use:

```tsx
<Tooltip>
  <TooltipTrigger asChild><Button variant="ghost" size="icon"><InfoIcon /></Button></TooltipTrigger>
  <TooltipContent>More information</TooltipContent>
</Tooltip>
```

### Toaster / useToast

Wrap the app in `<ToastProvider>` at root. Then anywhere:

```tsx
const { toast } = useToast();
toast({ title: 'Saved', variant: 'success' });
toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
```

Variants: `default | destructive | success | warning`. Toasts auto-dismiss after 4s.

---

## Navigation

### Tabs, TabsList, TabsTrigger, TabsContent

```tsx
<Tabs defaultValue="general">
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="seo">SEO</TabsTrigger>
  </TabsList>
  <TabsContent value="general">{/* general form */}</TabsContent>
  <TabsContent value="seo">{/* seo form */}</TabsContent>
</Tabs>
```

### Avatar, AvatarImage, AvatarFallback

```tsx
<Avatar>
  <AvatarImage src={user.avatarUrl} alt={user.name} />
  <AvatarFallback>{initials(user.name)}</AvatarFallback>
</Avatar>
```

### Skeleton

Loading placeholder. Match dimensions of the actual content.

```tsx
<Skeleton className="h-4 w-48" />
<Skeleton className="h-32 w-full" />
```

---

## Forms

Forms are built on `react-hook-form` + `zod`. Composition is:

```
Form (RHF provider)
  └── FormField (Controller)
        └── FormItem (styling + a11y wrapper)
              ├── FormLabel
              ├── FormControl (auto-wires aria-describedby, aria-invalid)
              │     └── <Input> / <Select> / ...
              ├── FormDescription (optional hint text)
              └── FormMessage (validation error)
```

**Never** use raw `<label>` + `<input>` inside a form scope. See [PATTERNS.md § Form](./PATTERNS.md#form) for a full example.

---

## Tables

Use the `<DataTable>` pattern for all data lists (see [PATTERNS.md § DataTable](./PATTERNS.md#datatable)).

Low-level table primitives (`<Table>`, `<TableHeader>`, `<TableRow>`, `<TableCell>`, ...) exist for niche cases (fixed-layout summaries, custom cell layouts). If you find yourself building a table with sorting/filtering/pagination by hand, stop and use `DataTable`.

---

## Utility: `cn`

Combines conditional classes and de-dupes conflicting Tailwind utilities.

```tsx
import { cn } from '@ecom/ui';

<div className={cn('rounded p-4', isActive && 'bg-primary', className)} />
```

Always use `cn(...)` — never string-concatenate class names.
