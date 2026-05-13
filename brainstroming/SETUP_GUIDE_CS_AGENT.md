# MCP Desktop Setup - WKWK Customer Care Integration

## Overview
Dokumentasi lengkap untuk setup customer care agent di Claude Desktop dengan system prompt + knowledge base JSON.

---

## Prerequisites
- Claude Desktop (Windows/Mac/Linux)
- MCP servers sudah configured: mysql-mcp, wj-cs (atau custom endpoint)
- Text editor untuk config files
- JSON knowledge base ready

---

## Step 1: Organize Files

```
claude-desktop/
├── config/
│   ├── claude_desktop_config.json    (existing)
│   └── mcp_servers.json              (existing MCP configs)
├── assets/
│   ├── cs_system_prompt.md           (NEW - baru dibuat)
│   └── wkwk_qna_knowledge_base.json  (NEW - baru dibuat)
└── docs/
    └── SETUP_CS_AGENT.md             (this guide)
```

---

## Step 2: Create MCP Server for Customer Care (Optional but Recommended)

Jika ingin dedicated MCP server untuk CS agent dengan built-in knowledge base:

### Option A: Use existing `wj-cs` endpoint
Jika wj-cs sudah expose customer info via tools, Anda cukup update system prompt di Claude Desktop.

### Option B: Create custom `cs-agent-mcp` server
```javascript
// cs-agent-mcp-server/src/index.ts
import Anthropic from "@anthropic-sdk/sdk";
import { Server } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const KB = require("./knowledge-base.json"); // Load knowledge base

const server = new Server({
  name: "cs-agent-mcp",
  version: "1.0.0",
});

// Tool: Get QnA from knowledge base
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_qa") {
    const category = request.params.arguments.category;
    const question_id = request.params.arguments.question_id;
    const qa = KB.faq[category][question_id];
    return {
      content: [{ type: "text", text: JSON.stringify(qa, null, 2) }],
    };
  }

  if (request.params.name === "get_discount_codes") {
    return {
      content: [{ type: "text", text: JSON.stringify(KB.discount_codes) }],
    };
  }

  if (request.params.name === "get_paket_info") {
    const paket = request.params.arguments.paket_name;
    return {
      content: [
        { type: "text", text: JSON.stringify(KB.paket_kelas[paket]) },
      ],
    };
  }
});

server.connect(new StdioClientTransport());
```

Namun untuk simplicity, Anda bisa skip ini dan langsung ke Step 3.

---

## Step 3: Load System Prompt + KB ke Claude Desktop

Claude Desktop tidak punya native file loading di system prompt. Workaround:

### Option 1: Embed System Prompt di claude_desktop_config.json (Recommended)

Edit: `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac)
atau: `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "wj-cs": {
      "command": "node",
      "args": ["/path/to/wj-cs-server/dist/index.js"],
      "env": {
        "WKWK_SYSTEM_PROMPT": "/path/to/cs_system_prompt.md",
        "WKWK_KB": "/path/to/wkwk_qna_knowledge_base.json"
      }
    },
    "mysql-mcp": {
      "command": "node",
      "args": ["path/to/mysql-mcp/dist/index.js"]
    }
  }
}
```

### Option 2: Copy-paste System Prompt into Claude Desktop UI (Manual)

1. Open Claude Desktop
2. Start new conversation
3. Paste entire content dari `cs_system_prompt.md` as first message: 
   ```
   [Full system prompt text]
   
   Knowledge base JSON attached:
   [Paste wkwk_qna_knowledge_base.json]
   ```
4. Pin this as "System Instructions" (feature: if available)
5. Begin customer service roleplay

### Option 3: Use Artifacts + API (Advanced)

Create artifact that:
- Loads `cs_system_prompt` as embedded string
- Loads `wkwk_qna_knowledge_base.json` as embedded data
- Calls Claude API with system prompt
- Renders interactive chat UI

---

## Step 4: Usage in Claude Desktop

### To Activate Customer Care Mode:

**Simple method (if using Option 2):**
```
You: I want to enable customer care mode for WKWK.

Claude: [Load system prompt + KB from your previous message]

You: halo kak, saya mau tanya kelas

Claude: [Respond as customer care agent]
```

**With MCP integration (if using Option 1):**
- System automatically loads prompt + KB at startup
- Just start with customer message
- Claude has access to wj-cs tools + knowledge base

---

## Step 5: Testing Workflow

### Test Case 1: Basic Greeting
```
Customer: Halo kak, saya mau tanya tentang kelas N5

Expected: 
- Warm greeting
- Identify as new customer
- Start needs assessment
```

### Test Case 2: Needs Assessment
```
Customer: Saya belum pernah belajar Jepang, tapi sudah tahu hiragana. Tujuannya hobby. Waktu saya santai.

Expected:
- Summarize profile
- Ask follow-up (budget, format preference)
- Prepare recommendation
```

### Test Case 3: Recommendation
```
Customer: Boleh, saya serius. Budget fleksibel, prefer online.

Expected:
- Recommend N5 Batch 40 (matching profile)
- Mention pricing (both cicil & sekali bayar)
- Offer discount codes
- Ask confirmation
```

### Test Case 4: Booking
```
Customer: Oke saya mau ambil N5 sekali bayar.

Expected:
- Confirm paket details
- Collect data (nama, email, WA, alamat, usia)
- Generate payment link
- Recap next steps
```

### Test Case 5: Edge Case - Job Placement Question
```
Customer: Saya mau kerja di Jepang setelah lulus N5. Bisa bantu?

Expected:
- Honest: "Kami fokus language learning"
- Reference: "Ada partner TG Japan untuk job placement"
- Offer: "Saya connect Anda ke mereka?"
```

---

## Step 6: Monitoring & Updates

### Data to Log Each Interaction:
- Customer name / WA (if identified)
- Profile: experience level, goal, time, budget
- Paket recommended & reason
- Discount code used (if any)
- Final action: registered / interested / not qualified

### Update Knowledge Base When:
- Harga berubah
- Batch baru launch
- Discount code expired
- FAQ baru dari customer feedback
- Partnership info update (TG Japan, Go Global)

### Update System Prompt When:
- Tone/voice guideline change
- New business rule
- Escalation policy updated
- Tool availability changed

---

## Step 7: Production Deployment

### For Team Use:
1. **Version Control**: Commit cs_system_prompt.md + wkwk_qna_knowledge_base.json ke repo
2. **Change Log**: Track changes ke prompt & KB (who, when, why)
3. **Review Process**: Sebelum deploy, review dengan marketing/supervisor
4. **Training**: Onboard tim dengan expected behavior & edge cases

### Backup & Recovery:
```bash
# Backup current config
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json \
   ./backups/config_$(date +%Y%m%d).json

# Backup KB & prompt
cp cs_system_prompt.md backups/
cp wkwk_qna_knowledge_base.json backups/
```

---

## Step 8: Troubleshooting

| Issue | Solution |
|-------|----------|
| Prompt terlalu panjang (token limit) | Compress: move verbose explanations to JSON examples |
| KB JSON not loading | Check path: use absolute path, not relative |
| Tools tidak tersedia (wj-cs timeout) | Restart Claude Desktop, check MCP server status |
| Gaya bahasa tidak sesuai | Review system prompt, adjust personality traits |
| Discount code info outdated | Update JSON langsung, restart desktop |

---

## File Checklist

- [x] `cs_system_prompt.md` - Core personality + rules
- [x] `wkwk_qna_knowledge_base.json` - FAQ, pricing, templates
- [ ] MCP server config (if custom server)
- [ ] claude_desktop_config.json - Updated with env vars
- [ ] Test cases completed
- [ ] Backup created

---

## Next Steps

1. **Copy files** ke Claude Desktop folder struktur
2. **Test** dengan roleplay scenarios (langsung di Claude)
3. **Iterate** prompt berdasarkan test results
4. **Deploy** ke tim dengan documentation
5. **Monitor** interaction logs untuk QA/improvement

---

## Contact & Support

Jika ada perubahan paket/pricing/policy:
1. Update `wkwk_qna_knowledge_base.json`
2. Test di Claude Desktop
3. Commit & backup
4. Notify tim via Slack/chat

Untuk custom extension (job matching tool, advanced analytics):
- Extend MCP server tools
- Update system prompt dengan new tool references
- Document tool availability in prompt

