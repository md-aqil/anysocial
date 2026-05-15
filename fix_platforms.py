import re

with open('frontend/src/app/dashboard/posts/new/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Normalize CRLF
content = content.replace('\r\n', '\n')

# Find the start of the orphaned select tag around line 516
# We know it starts with '                  <select \n                    className="w-full h-10'
# and goes all the way to end of youtube preview or end of youtube settings.
# Let's find the start of the orphaned twitter settings block
start_match = re.search(r'\s*<select \n\s*className="w-full h-10 px-3 rounded-md border bg-background"\n\s*\{\.\.\.register\(\'twitterReplySettings\'\)\}', content)
if not start_match:
    print("Could not find start match")
    exit(1)

start_pos = start_match.start()

# Now find the end of the YouTube settings block
end_match = re.search(r'\{/\* YouTube SEO Preview \(High Fidelity & Format-Aware\) \*/\}', content)
if not end_match:
    print("Could not find end match")
    exit(1)

end_pos = end_match.start()

# Remove the orphaned block
content = content[:start_pos] + content[end_pos:]

# Now let's inject the YouTube settings into the unified block.
# Find the end of the Snapchat block inside the unified block.
snapchat_end_match = re.search(r'\{/\* Snapchat \*/\}.*?\{/\* Facebook Settings - REMOVED \(merged above\) \*/\}', content, re.DOTALL)
if not snapchat_end_match:
    print("Could not find snapchat end match to inject youtube")
    exit(1)

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
                      <Switch checked={watch('youtubeAutoFix')} onCheckedChange={(val) => setValue('youtubeAutoFix', val)} />
                    </div>
                    <div className="flex items-center justify-between py-1 border-t border-red-100 pt-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-xs font-medium text-orange-700">Made for Kids?</span>
                      </div>
                      <Switch checked={watch('youtubeMadeForKids')} onCheckedChange={(val) => setValue('youtubeMadeForKids', val)} />
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

snapchat_start = snapchat_end_match.start()
snapchat_text = snapchat_end_match.group(0)

# Replace the match with snapchat block + youtube block
new_text = snapchat_text.replace('{/* Facebook Settings - REMOVED (merged above) */}', youtube_unified)

content = content[:snapchat_start] + new_text + content[snapchat_start + len(snapchat_text):]

with open('frontend/src/app/dashboard/posts/new/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
