import sys

with open('frontend/src/app/dashboard/posts/new/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find the exact boundaries.
# We want to remove from the broken twitter block (line 515/516) up to the end of the YouTube block.
start_marker = '<select \n                    className="w-full h-10 px-3 rounded-md border bg-background"\n                    {...register(\'twitterReplySettings\')}'
end_marker = '{/* YouTube SEO Preview (High Fidelity & Format-Aware) */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1:
    print("Could not find start marker")
    sys.exit(1)

if end_idx == -1:
    print("Could not find end marker")
    sys.exit(1)

# Backtrack start_idx slightly to catch the `<select` exactly
# And we'll just slice the content
content = content[:start_idx] + content[end_idx:]

with open('frontend/src/app/dashboard/posts/new/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("REMOVED_OLD_BLOCKS")
