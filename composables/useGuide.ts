import { findGuide, type LoadedGuide } from '~/utils/loadGuides'
import { useGuides } from '~/composables/useGuides'

/** One guide by slug (= content filename stem), or undefined if none matches. */
export const useGuide = (slug: string): LoadedGuide | undefined =>
  findGuide(useGuides(), slug)
