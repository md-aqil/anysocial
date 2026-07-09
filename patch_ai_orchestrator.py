import re

with open("src/services/ai-orchestrator.service.ts", "r") as f:
    content = f.read()

# Replace analyzeMedia
content = re.sub(
    r"async analyzeMedia\(mediaFile: any\): Promise<any> \{(\s*)if \(!this.vertexAI\)",
    r"async analyzeMedia(mediaFile: any): Promise<any> {\1const settings = await this.getAiSettings();\1if (!this.vertexAI)",
    content
)
content = re.sub(
    r"const model = this\.vertexAI\.getGenerativeModel\(\{ model: process\.env\.VERTEX_AI_MODEL \|\| 'gemini-2\.5-flash' \}\);",
    r"const model = this.vertexAI.getGenerativeModel({ model: settings.text.primary });",
    content
)

# Replace adaptContent
content = re.sub(
    r"async adaptContent\(content: string, platform: string\): Promise<\{ adaptedContent: string \}> \{(\s*)if \(!this.vertexAI\)",
    r"async adaptContent(content: string, platform: string): Promise<{ adaptedContent: string }> {\1const settings = await this.getAiSettings();\1if (!this.vertexAI)",
    content
)

# Replace chatContent
content = re.sub(
    r"async chatContent\(messages: any\[\], mediaFile\?: any\): Promise<string> \{(\s*)try \{(\s*)if \(!this.vertexAI\)",
    r"async chatContent(messages: any[], mediaFile?: any): Promise<string> {\1try {\2const settings = await this.getAiSettings();\2if (!this.vertexAI)",
    content
)

# Replace generateContent
content = re.sub(
    r"async generateContent\(prompt: string, mediaParts\?: \{ data: string, mimeType: string \}\[\], useAdvancedModel: boolean = true\): Promise<string> \{(\s*)try \{(\s*)const settings = await this.getAiSettings\(\);\2if \(useAdvancedModel\)",
    r"async generateContent(prompt: string, mediaParts?: { data: string, mimeType: string }[], useAdvancedModel: boolean = true): Promise<string> {\1try {\2const settings = await this.getAiSettings();\2if (useAdvancedModel)",
    content
)
# Ensure we add settings to generateContent if the above regex fails
if "const settings = await this.getAiSettings();" not in content.split("async generateContent")[1][:100]:
    content = re.sub(
        r"async generateContent\(prompt: string, mediaParts\?: \{ data: string, mimeType: string \}\[\], useAdvancedModel: boolean = true\): Promise<string> \{(\s*)try \{(\s*)if \(useAdvancedModel\)",
        r"async generateContent(prompt: string, mediaParts?: { data: string, mimeType: string }[], useAdvancedModel: boolean = true): Promise<string> {\1try {\2const settings = await this.getAiSettings();\2if (useAdvancedModel)",
        content
    )

content = re.sub(
    r"const modelName = overrideModel \|\| process\.env\.VERTEX_AI_MODEL \|\| 'gemini-3\.1-pro-preview';",
    r"const modelName = overrideModel || settings.text.primary;",
    content
)

content = re.sub(
    r"return await executeScriptGen\('gemini-2\.5-pro'\);",
    r"return await executeScriptGen(settings.text.secondary);",
    content
)

# Replace generateVoiceover
content = re.sub(
    r"async generateVoiceover\(text: string, voiceName: string = 'en-US-Journey-D', language: string = 'en-US', useAdvancedModel: boolean = false\): Promise<string> \{(\s*)if \(useAdvancedModel\)",
    r"async generateVoiceover(text: string, voiceName: string = 'en-US-Journey-D', language: string = 'en-US', useAdvancedModel: boolean = false): Promise<string> {\1const settings = await this.getAiSettings();\1if (useAdvancedModel)",
    content
)
content = re.sub(
    r"const modelName = overrideModel \|\| 'gemini-3\.1-flash-tts-preview';",
    r"const modelName = overrideModel || (settings.voice.primary.includes('gemini') ? settings.voice.primary : 'gemini-2.5-flash');",
    content
)
content = re.sub(
    r"return await executeVoiceGen\('gemini-2\.5-pro-tts'\);",
    r"return await executeVoiceGen(settings.voice.secondary.includes('gemini') ? settings.voice.secondary : 'gemini-2.5-pro');",
    content
)
content = re.sub(
    r"return await executeVoiceGen\('gemini-2\.5-flash'\);",
    r"return await executeVoiceGen(settings.voice.tertiary.includes('gemini') ? settings.voice.tertiary : 'gemini-2.5-flash');",
    content
)

with open("src/services/ai-orchestrator.service.ts", "w") as f:
    f.write(content)
