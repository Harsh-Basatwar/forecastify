import * as React from 'react';
import { useInView, type UseInViewOptions } from 'motion/react';

interface UseIsInViewOptions {
  inView?: boolean;
  inViewOnce?: boolean;
  inViewMargin?: UseInViewOptions['margin'];
}

function useIsInView<T extends HTMLElement = HTMLElement>(
  ref: React.Ref<T>,
  options: UseIsInViewOptions = {},
) {
  const { inView, inViewOnce = false, inViewMargin = '0px' } = options;
  const localRef = React.useRef<T>(null);
  React.useImperativeHandle(ref, () => localRef.current as T, []);

  // `useInView` must be called unconditionally (hook rules), but pass a null
  // target when in-view triggering is off so no IntersectionObserver is
  // created for the many icons that never use it.
  const observerTarget = inView ? localRef : { current: null };
  const inViewResult = useInView(observerTarget as React.RefObject<T>, {
    once: inViewOnce,
    margin: inViewMargin,
  });

  const isInView = !inView || inViewResult;
  return { ref: localRef, isInView };
}

export { useIsInView, type UseIsInViewOptions };
