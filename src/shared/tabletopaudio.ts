import * as t from "typanion";

// a bit naive, but that should be sufficient for now.
const isUrl = () => t.matchesRegExp(/https:\/\//);

export const isTabletopAudioIndex = t.isObject({
  tracks: t.isArray(
    t.isObject({
      key: t.applyCascade(t.isNumber(), [t.isInteger()]),
      track_title: t.isString(),
      track_type: t.isString(),
      track_genre: t.isArray(t.isString()),
      flavor_text: t.isString(),
      link: t.applyCascade(t.isString(), [isUrl()]),
      small_image: t.applyCascade(t.isString(), [isUrl()]),
      large_image: t.applyCascade(t.isString(), [isUrl()]),
      new: t.isUnknown(),
      tags: t.isArray(t.isString()),
    })
  ),
});

export type TabletopAudioIndex = t.InferType<typeof isTabletopAudioIndex>;

export const isTabletopAudioAsset = t.isObject(
  {
    extra: t.isObject(
      {
        tabletopAudioKey: t.applyCascade(t.isNumber(), [t.isInteger()]),
      },
      { extra: t.isUnknown() }
    ),
  },
  { extra: t.isUnknown() }
);

export type RRAssetTabletopAudio = t.InferType<typeof isTabletopAudioAsset>;
