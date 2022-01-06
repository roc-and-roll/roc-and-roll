import * as z from "zod";

export const isTabletopAudioIndex = z.strictObject({
  tracks: z.array(
    z.strictObject({
      key: z.number().int(),
      track_title: z.string(),
      track_type: z.string(),
      track_genre: z.array(z.string()),
      flavor_text: z.string(),
      link: z.string().url(),
      small_image: z.string().url(),
      large_image: z.string().url(),
      new: z.unknown(),
      tags: z.array(z.string()),
    })
  ),
});

export type TabletopAudioIndex = z.infer<typeof isTabletopAudioIndex>;

export const isTabletopAudioAsset = z
  .strictObject({
    extra: z.strictObject({ tabletopAudioKey: z.number().int() }).passthrough(),
  })
  .passthrough();

export type RRAssetTabletopAudio = z.infer<typeof isTabletopAudioAsset>;
