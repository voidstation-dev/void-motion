/**
 * UI primitives smoke tests (M02).
 *
 * Verifies that every shadcn/ui primitive installed in M02 imports cleanly
 * and renders a valid ReactElement under jsdom. This is a structural guard —
 * it does NOT assert visual parity (that comes via golden fixtures once the
 * engine is wired up). It catches three classes of regression:
 *   1. a primitive whose default export was renamed/removed by a dep bump,
 *   2. a Radix forwardRef whose host element type drifted (typecheck covers
 *      this at compile time, but jsdom catches runtime rendering failures),
 *   3. the `cn` helper or a variant resolver throwing for default props.
 */
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'

import { Button, buttonVariants } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import { Label } from '@/app/components/ui/label'
import { Slider } from '@/app/components/ui/slider'
import { Progress } from '@/app/components/ui/progress'
import { Separator } from '@/app/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/app/components/ui/select'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/app/components/ui/alert-dialog'
import { Popover, PopoverTrigger, PopoverContent } from '@/app/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/app/components/ui/dropdown-menu'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/app/components/ui/context-menu'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/app/components/ui/tooltip'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { Toggle } from '@/app/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'

function renderEl(el: ReactElement): void {
  const { unmount } = render(el)
  unmount()
}

describe('M02 UI primitives — import + render smoke', () => {
  it('cn-based Button renders for every variant', () => {
    for (const variant of [
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
    ] as const) {
      renderEl(<Button variant={variant}>x</Button>)
    }
    for (const size of ['default', 'sm', 'lg', 'icon'] as const) {
      renderEl(<Button size={size}>x</Button>)
    }
    expect(typeof buttonVariants({ variant: 'default' })).toBe('string')
  })

  it('form primitives render', () => {
    renderEl(<Input placeholder="p" />)
    renderEl(<Textarea placeholder="p" />)
    renderEl(<Label>Label</Label>)
  })

  it('range + progress + separator render', () => {
    renderEl(<Slider defaultValue={[50]} max={100} />)
    renderEl(<Progress value={50} />)
    renderEl(<Separator />)
    renderEl(<Separator orientation="vertical" />)
  })

  it('Tabs render with trigger + content', () => {
    renderEl(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">content</TabsContent>
      </Tabs>,
    )
  })

  it('Select renders trigger + content + item', () => {
    renderEl(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="x">X</SelectItem>
        </SelectContent>
      </Select>,
    )
  })

  it('Dialog renders (closed by default, trigger present)', () => {
    renderEl(
      <Dialog>
        <DialogTrigger>open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>title</DialogTitle>
            <DialogDescription>desc</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    )
  })

  it('AlertDialog renders with action + cancel', () => {
    renderEl(
      <AlertDialog>
        <AlertDialogTrigger>open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>title</AlertDialogTitle>
            <AlertDialogDescription>desc</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction>ok</AlertDialogAction>
          <AlertDialogCancel>cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    )
  })

  it('Popover renders', () => {
    renderEl(
      <Popover>
        <PopoverTrigger>open</PopoverTrigger>
        <PopoverContent>content</PopoverContent>
      </Popover>,
    )
  })

  it('DropdownMenu renders with item + label + separator', () => {
    renderEl(
      <DropdownMenu>
        <DropdownMenuTrigger>open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>label</DropdownMenuLabel>
          <DropdownMenuItem>item</DropdownMenuItem>
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>,
    )
  })

  it('ContextMenu renders with item', () => {
    renderEl(
      <ContextMenu>
        <ContextMenuTrigger>root</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>item</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    )
  })

  it('Tooltip renders (closed by default)', () => {
    renderEl(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>hover</TooltipTrigger>
          <TooltipContent>tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    )
  })

  it('ScrollArea renders with children', () => {
    renderEl(<ScrollArea className="h-40">content</ScrollArea>)
  })

  it('Toggle + ToggleGroup render', () => {
    renderEl(<Toggle>on</Toggle>)
    renderEl(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    )
  })

  it('Sheet renders with header + title', () => {
    renderEl(
      <Sheet>
        <SheetTrigger>open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    )
  })
})
