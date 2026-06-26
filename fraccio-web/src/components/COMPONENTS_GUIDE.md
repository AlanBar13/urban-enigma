# Custom Component Library

A modern, modular component library built with React, TypeScript, Tailwind CSS, Radix UI, and CVA (Class Variance Authority). This library is organized by feature domains and designed for a multi-tenant SaaS application.

## 📁 Component Structure

Components are organized into domain-based folders under `src/components/`:

```
components/
├── shared/           # Data display & utility components (Badge, Avatar, DataTable, List)
├── layouts/          # Layout containers (DashboardLayout, PageHeader, Section, Stack, Grid)
├── tenant/           # Multi-tenant specific (TenantSelector, RoleBadge, WorkspaceCard)
├── navigation/       # Navigation & pagination (Breadcrumbs, Tabs, Pagination, SidebarNav)
├── forms/            # Form elements (FormField, Textarea, Select, MultiStepForm, etc.)
├── modals/           # Dialog & modal components (Dialog, ConfirmDialog, FormModal, Drawer)
└── notifications/    # Alerts & toasts (Alert, Callout, Toast, SnackBar)
```

## 🎨 Design Philosophy

- **Modern & User-Friendly**: Smooth animations, dark mode support, and responsive design
- **Consistent Styling**: Uses Tailwind CSS v4 with CVA for variant management
- **Accessible**: Built on Radix UI primitives with ARIA labels and keyboard navigation
- **Type-Safe**: Full TypeScript support with proper interfaces
- **Composable**: Designed to work together seamlessly

## 📦 Shared Components

### Badge
A flexible badge component with multiple variants and sizes.

```typescript
import { Badge } from '@/components/shared'

<Badge variant="default" size="md">Label</Badge>
<Badge variant="success" size="lg">Success</Badge>
```

**Props**: `variant` | `size` | `className`

### Avatar
Display user/team avatars with fallback support.

```typescript
import { Avatar, AvatarImage, AvatarFallback } from '@/components/shared'

<Avatar size="md">
  <AvatarImage src="https://..." />
  <AvatarFallback>AL</AvatarFallback>
</Avatar>
```

**Props**: `size` (sm | md | lg | xl)

### Skeleton
Loading skeleton component with pulse animation.

```typescript
import { Skeleton } from '@/components/shared'

<Skeleton className="h-12 w-12 rounded-full" />
```

### DataTable
Feature-rich table component with sorting and customizable columns.

```typescript
import { DataTable } from '@/components/shared'

<DataTable
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' }
  ]}
  data={users}
  onSort={(key, direction) => {}}
  hoverable
  striped
/>
```

**Props**:
- `columns`: Array of column definitions
- `data`: Array of items
- `onSort`: Sort callback
- `hoverable`, `striped`, `dense`: Display options

### List & ListItem
Flexible list component with variants and spacing.

```typescript
import { List, ListItem } from '@/components/shared'

<List variant="vertical" spacing="md" border="divider">
  <ListItem active>Item 1</ListItem>
  <ListItem>Item 2</ListItem>
</List>
```

## 🎯 Layout Components

### DashboardLayout
Complete dashboard layout with responsive sidebar and header.

```typescript
import { DashboardLayout } from '@/components/layouts'

<DashboardLayout
  sidebar={<SidebarContent />}
  header={<HeaderContent />}
  sidebarWidth="md"
>
  <main>Dashboard content</main>
</DashboardLayout>
```

### PageHeader
Hero section with title, description, and action button.

```typescript
import { PageHeader } from '@/components/layouts'

<PageHeader
  title="Manage Users"
  description="View and manage all users"
  action={<Button>Add User</Button>}
/>
```

### Section
Container for grouped content with padding and variant options.

```typescript
import { Section } from '@/components/layouts'

<Section padding="lg" variant="bordered">
  Content here
</Section>
```

### Stack & Grid
Flexible flexbox and grid layout helpers.

```typescript
import { Stack, Grid } from '@/components/layouts'

<Stack direction="col" gap="lg" align="center">
  Content
</Stack>

<Grid cols={3} gap="md" responsive>
  Grid items
</Grid>
```

## 👥 Tenant Components

### TenantSelector
Dropdown for switching between workspaces.

```typescript
import { TenantSelector } from '@/components/tenant'

<TenantSelector
  tenants={[
    { id: '1', name: 'Acme Corp', role: 'owner' }
  ]}
  selectedTenantId="1"
  onSelect={(id) => {}}
/>
```

### TenantHeader
Display current tenant with role and switch button.

```typescript
import { TenantHeader } from '@/components/tenant'

<TenantHeader
  tenantName="Acme Corp"
  userRole="admin"
  onSwitch={() => {}}
/>
```

### RoleBadge
Tenant role indicator with color coding.

```typescript
import { RoleBadge } from '@/components/tenant'

<RoleBadge role="owner" variant="badge" size="md" />
<RoleBadge role="member" variant="outlined" />
```

### WorkspaceCard
Card for displaying and selecting workspaces.

```typescript
import { WorkspaceCard } from '@/components/tenant'

<WorkspaceCard
  id="1"
  name="Workspace Name"
  description="Description"
  memberCount={5}
  role="admin"
  selected={true}
  onSelect={(id) => {}}
/>
```

## 🧭 Navigation Components

### Breadcrumbs
Navigation breadcrumb trail.

```typescript
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/navigation'

<Breadcrumb>
  <BreadcrumbItem>
    <BreadcrumbLink href="/">Home</BreadcrumbLink>
  </BreadcrumbItem>
  <BreadcrumbSeparator />
  <BreadcrumbItem isCurrent>Current Page</BreadcrumbItem>
</Breadcrumb>
```

### Tabs
Tab navigation component.

```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/navigation'

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
</Tabs>
```

### Pagination
Pagination controls.

```typescript
import { Pagination } from '@/components/navigation'

<Pagination
  currentPage={1}
  totalPages={10}
  onPageChange={(page) => {}}
/>
```

### SidebarNav
Collapsible sidebar navigation with badges.

```typescript
import { SidebarNav } from '@/components/navigation'

<SidebarNav
  items={[
    { id: '1', label: 'Dashboard', icon: <Icon /> },
    {
      id: '2',
      label: 'Settings',
      badge: 3,
      children: [
        { id: '2.1', label: 'Account' }
      ]
    }
  ]}
/>
```

## 📝 Form Components

### FormField
Wrapper for form fields with label, error, and hint.

```typescript
import { FormField } from '@/components/forms'
import { Input } from '@/components/ui/input'

<FormField label="Email" required error="Invalid email" hint="Use lowercase">
  <Input type="email" />
</FormField>
```

### Textarea & Select
Styled textarea and select elements.

```typescript
import { Textarea, Select } from '@/components/forms'

<Textarea placeholder="Enter text..." />
<Select>
  <option>Option 1</option>
</Select>
```

### MultiStepForm
Multi-step form with progress indicator.

```typescript
import { MultiStepForm } from '@/components/forms'

<MultiStepForm
  steps={[
    { id: '1', label: 'Basic Info', description: 'Enter your details' },
    { id: '2', label: 'Confirmation' }
  ]}
  currentStep={0}
  onStepChange={(step) => {}}
  onSubmit={() => {}}
>
  Form content for current step
</MultiStepForm>
```

### DynamicFieldArray
Add/remove dynamic form fields.

```typescript
import { DynamicFieldArray } from '@/components/forms'

<DynamicFieldArray
  fields={fields}
  onAddField={() => {}}
  onRemoveField={(idx) => {}}
  onFieldChange={(idx, val) => {}}
  renderField={(field, idx, onChange) => (
    <Input value={field} onChange={(e) => onChange(e.target.value)} />
  )}
  label="Add Items"
/>
```

### CheckboxGroup & RadioGroup
Group selection components.

```typescript
import { CheckboxGroup, RadioGroup } from '@/components/forms'

<CheckboxGroup
  options={[
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' }
  ]}
  value={selected}
  onChange={setSelected}
/>

<RadioGroup
  options={[{ label: 'Yes', value: 'yes' }]}
  value={selected}
  onChange={setSelected}
/>
```

## 🔔 Modal & Dialog Components

### Dialog (Base)
Low-level dialog primitive.

```typescript
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/modals'

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    Content
    <DialogFooter>
      <Button>Submit</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### ConfirmDialog
Confirmation dialog with customizable buttons.

```typescript
import { ConfirmDialog } from '@/components/modals'

<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Delete User?"
  description="This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  variant="destructive"
  onConfirm={async () => await deleteUser()}
/>
```

### AlertDialog
Alert dialog with icon and type (info/success/warning/error).

```typescript
import { AlertDialog } from '@/components/modals'

<AlertDialog
  open={open}
  title="Success!"
  description="Your changes have been saved."
  type="success"
/>
```

### FormModal
Modal with built-in form handling.

```typescript
import { FormModal } from '@/components/modals'

<FormModal
  open={open}
  onOpenChange={setOpen}
  title="Add Item"
  onSubmit={async () => {}}
>
  <FormField label="Name">
    <Input />
  </FormField>
</FormModal>
```

### Drawer
Side drawer component (mobile-friendly alternative to dialog).

```typescript
import { DrawerContent } from '@/components/modals'

<DrawerContent>
  Drawer content
</DrawerContent>
```

## 🔔 Notification Components

### Alert
Dismissable alert with multiple types.

```typescript
import { Alert } from '@/components/notifications'

<Alert
  type="success"
  title="Great!"
  description="Operation completed successfully."
  closable
  onClose={() => {}}
/>
```

### Callout
Non-dismissable callout for important information.

```typescript
import { Callout } from '@/components/notifications'

<Callout type="warning" title="Attention">
  This action is permanent.
</Callout>
```

### Toast
Toast notification system with context provider.

```typescript
import { ToastProvider, useToast, ToastContainer } from '@/components/notifications'

function App() {
  return (
    <ToastProvider>
      <YourApp />
      <ToastContainer />
    </ToastProvider>
  )
}

function MyComponent() {
  const { addToast } = useToast()

  const handleClick = () => {
    addToast({
      type: 'success',
      title: 'Success!',
      description: 'Item saved.',
      duration: 5000
    })
  }

  return <button onClick={handleClick}>Save</button>
}
```

### SnackBar
Inline snackbar notification with action.

```typescript
import { SnackBar } from '@/components/notifications'

<SnackBar
  type="info"
  message="Item deleted"
  action={{
    label: 'Undo',
    onClick: () => {}
  }}
  onClose={() => {}}
/>
```

## 🚀 Quick Start

### 1. Setup Toast Provider (Root Layout)
Wrap your app with `ToastProvider` in your root layout:

```typescript
// src/routes/__root.tsx
import { ToastProvider, ToastContainer } from '@/components/notifications'

export default function RootLayout() {
  return (
    <html>
      <body>
        <ToastProvider>
          <YourContent />
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  )
}
```

### 2. Import and Use
```typescript
import { DataTable, Badge } from '@/components/shared'
import { DashboardLayout, PageHeader } from '@/components/layouts'
import { TenantSelector } from '@/components/tenant'
import { useToast } from '@/components/notifications'

export default function Dashboard() {
  const { addToast } = useToast()

  return (
    <DashboardLayout
      sidebar={<SidebarNav items={navItems} />}
      header={<TenantHeader tenantName="Acme" />}
    >
      <PageHeader
        title="Users"
        action={<Button>Add User</Button>}
      />
      <DataTable columns={columns} data={users} />
    </DashboardLayout>
  )
}
```

## 🛠️ Customization

### Theming
Components use Tailwind CSS classes. Customize colors via:

- `tailwind.config.js` - Change color scheme
- Component props - Override on per-component basis
- CSS variables - For dynamic theming (if configured)

### Extending Components
All components are forwardRef'd and accept standard HTML attributes:

```typescript
<Badge className="custom-class" variant="custom">
  Extended Badge
</Badge>
```

## 📚 Component Dependencies

- **React**: 19.2.0+
- **TypeScript**: 5.7.2+
- **Tailwind CSS**: 4.0.6+
- **Radix UI**: Avatar, Dialog, Select, Tabs
- **CVA**: Class Variance Authority for variants
- **Lucide React**: Icon library

## 🎯 Best Practices

1. **Use Domains**: Organize related components in feature folders
2. **Type Safety**: Always provide proper TypeScript interfaces
3. **Accessibility**: Use semantic HTML and ARIA labels
4. **Performance**: Memoize callbacks, avoid unnecessary re-renders
5. **Responsive**: Use Tailwind breakpoints for mobile-first design
6. **Testing**: Components are designed for easy testing with data-testid attributes

## 📝 Contributing

When adding new components:

1. Choose the appropriate domain folder
2. Create component file with proper TypeScript types
3. Export from domain's `index.ts`
4. Document props with JSDoc comments
5. Ensure accessibility with ARIA labels
6. Support dark mode with proper Tailwind classes
7. Add examples to this README

---

**Built with ❤️ for modern SaaS applications**
