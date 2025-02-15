<!-- Button.svelte -->
<script lang="ts">
	import { cva, type VariantProps } from 'class-variance-authority';
	import classnames from 'classnames';

	const buttonVariants = cva(
		'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
		{
			variants: {
				variant: {
					default:
						'bg-[var(--primary)] text-[var(--primary-foreground)] shadow opacity-90 hover:opacity-100',
					destructive:
						'bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-sm hover:bg-[var(--bg-destructive)]',
					outline:
						'border border-input bg-[var(--background)] shadow-sm hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
					secondary:
						'bg-[var(--secondary)] text-[var(--secondary-foreground)] shadow-sm hover:bg-[--secondary]',
					ghost: 'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
					link: 'text-[var(--primary)] underline-offset-4 hover:underline'
				},
				size: {
					default: 'h-9 px-4 py-2',
					sm: 'h-8 rounded-md px-3 text-xs',
					lg: 'h-10 rounded-md px-8',
					icon: 'h-9 w-9'
				}
			},
			defaultVariants: {
				variant: 'default',
				size: 'default'
			}
		}
	);

	type $$Props = VariantProps<typeof buttonVariants> & {
		children: () => any;
		class?: string;
	};

	let { variant, size, children, ...rest }: $$Props = $props();

	let className: string = $state('');

	$effect(() => {
		const variants = buttonVariants({ variant, size, class: rest.class });
		className = classnames(variants);
	});
</script>

<button {...rest as any} class={className}>
	{@render children?.()}
</button>
