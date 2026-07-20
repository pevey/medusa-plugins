// Vendored from more-shadcn-svelte (https://github.com/kevwpl/more-shadcn-svelte).
// Copyright (c) 2025 kevwpl — MIT License. See README credits for the full notice.
import { getContext, setContext } from 'svelte';
import type { Writable } from 'svelte/store';

const IMAGE_ZOOM_KEY = Symbol('image-zoom');

export type ZoomImageData = {
	src: string;
	alt: string;
	index: number;
};

type ImageZoomContext = {
	currentImageIndex: Writable<number | null>;
	open: Writable<boolean>;

	registerImage: (imageData: Omit<ZoomImageData, 'index'>) => number;
	openImage: (index: number) => void;

	nextImage: () => void;
	prevImage: () => void;

	registeredImages: Writable<ZoomImageData[]>;
};

export function setImageZoomContext(ctx: ImageZoomContext) {
	setContext(IMAGE_ZOOM_KEY, ctx);
}

export function getImageZoomContext() {
	const ctx = getContext<ImageZoomContext>(IMAGE_ZOOM_KEY);
	if (!ctx) {
		throw new Error('ImageZoom.Trigger must be used inside an ImageZoom.Root');
	}
	return ctx;
}
