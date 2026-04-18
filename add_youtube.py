import sys

with open('frontend/src/app/dashboard/posts/new/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

snapchat_marker = '{/* Snapchat */}'
# Find the Snapchat block end
snapchat_end = content.find('</CardContent>', content.find(snapchat_marker))

if snapchat_end == -1:
    print("Could not find end of snapchat block")
    sys.exit(1)

youtube_unified = """
              {/* YouTube */}
              {selectedPlatforms.includes('YOUTUBE') && (
                <div className="rounded-xl border border-red-100 overflow-hidden">
                  <div className="bg-red-600 h-1 w-full" />
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-bold text-red-700">YouTube</p>
                    <div className="flex gap-2">
                      {['VIDEO', 'SHORTS'].map(t => (
                        <button key={t} type="button"
                          onClick={() => setValue('youtubePostType', t as any)}
                          className={cn('flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all',
                            watch('youtubePostType') === t ? 'bg-red-600 text-white border-red-600' : 'border-slate-200 text-slate-600 hover:border-red-300'
                          )}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Privacy</Label>
                        <select className="w-full h-8 px-2 text-xs rounded-lg border bg-background" {...register('youtubePrivacy')}>
                          <option value="public">Public</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <select className="w-full h-8 px-2 text-xs rounded-lg border bg-background" {...register('youtubeCategory')}>
                          <option value="22">People & Blogs</option>
                          <option value="23">Comedy</option>
                          <option value="24">Entertainment</option>
                          <option value="1">Film & Animation</option>
                          <option value="10">Music</option>
                          <option value="25">News & Politics</option>
                          <option value="26">How-to & Style</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SEO Tags</Label>
                      <Input placeholder="fashion, review, tips (comma separated)" {...register('youtubeTags')} className="text-xs h-8" />
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-xs font-medium">Auto-Fix media</span>
                      </div>
                      <Controller name="youtubeAutoFix" control={control}
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                    </div>
                    <div className="flex items-center justify-between py-1 border-t border-red-100 pt-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-xs font-medium text-orange-700">Made for Kids?</span>
                      </div>
                      <Controller name="youtubeMadeForKids" control={control}
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-red-100">
                      <Label className="text-xs font-semibold">Custom Thumbnail (Optional)</Label>
                      {watch('youtubeThumbnail') ? (
                        <div className="relative w-full rounded-lg overflow-hidden border border-red-200 aspect-video bg-black">
                          <img src={URL.createObjectURL(watch('youtubeThumbnail') as File)} className="w-full h-full object-cover" alt="Thumb" />
                          <button type="button" onClick={() => setValue('youtubeThumbnail', undefined)} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full py-4 rounded-lg border-2 border-dashed border-red-200 bg-red-50 cursor-pointer hover:bg-red-100">
                          <Upload className="h-4 w-4 text-red-400 mb-1" />
                          <p className="text-[10px] text-red-600 font-medium">Upload thumbnail</p>
                          <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
                            if (e.target.files?.[0]) setValue('youtubeThumbnail', e.target.files[0] as any);
                          }} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}
"""

content = content[:snapchat_end] + youtube_unified + content[snapchat_end:]

with open('frontend/src/app/dashboard/posts/new/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("ADDED_YOUTUBE")
