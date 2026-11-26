import type { DriveStep } from 'driver.js'

// Walkthrough content. The opening tour covers the whole shell once; every screen then has its own tour
// (CUSTOM / screenTour) that auto-starts the first time the screen opens and replays from the "?" button.
// Tours go control by control: every pane, button and action that is on screen gets its own step. Steps
// whose anchor is hidden are skipped at runtime (see visible() in tour.ts), so a tour adapts to the
// screen's current state and never errors on a collapsed pane or a locked screen.

export const GLOBAL_TOUR: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to the BAM Workbench',
      description: 'This is the guided pipeline from discovery document to deployed skill. Four stages - Ingestion, Context, Workbench and Validation - with an approval gate at every step that matters. Let me show you around.',
    },
  },
  {
    element: '[data-tour="goal"]',
    popover: {
      title: 'First, name the agent',
      description: 'Type what the agent should do, for whom and where. BuLL expands it into the full scope and opens the pipeline for you.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="goal-cards"]',
    popover: {
      title: 'What, Who and Where',
      description: 'As you type, BuLL picks the What, Who and Where out of your goal into these cards. Click a card to highlight that part of your sentence and fix it.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="nav"]',
    popover: {
      title: 'Navigate the pipeline',
      description: 'The four stages live here, each with its screens. A stage shows Waiting, In progress or Done; open one to see its steps. A person chip means the step waits for a human; the bull chip means it runs on its own.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-search"]',
    popover: {
      title: 'Search the workflow',
      description: 'Type here to jump straight to any step by name - no need to remember which stage holds it.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-files"]',
    popover: {
      title: 'Start by adding files',
      description: 'Every run begins in Ingestion. Send the agent\'s goal in the chat, then add the source documents here: choose a folder, bulk upload or drop a zip.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="workspace"]',
    popover: {
      title: 'Results & edits',
      description: 'The current screen\'s work happens here: review what the pipeline produced, edit where the screen allows it, and approve when it is right.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="action"]',
    popover: {
      title: 'One primary action',
      description: 'Each screen pins its single next action at the bottom, like Start ingestion. Nothing moves forward without it, so you always know what happens next.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="sync"]',
    popover: {
      title: 'Saved, always',
      description: 'Every change is saved to the backend the moment you make it. This line confirms the last sync - if the backend is ever unreachable, it says so here.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="env"]',
    popover: {
      title: 'FDE and Staging views',
      description: 'Switch between the FDE workspace (blue) and the Staging view (orange) to see the app the way each side sees it. This changes the view, not what is deployed.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="theme"]',
    popover: {
      title: 'Dark or light',
      description: 'Switch the whole app between the dark and light theme, whatever is easier on your eyes.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="profile"]',
    popover: {
      title: 'Your profile',
      description: 'See who is signed in, switch to the Masters view, or sign out.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="assistant"]',
    popover: {
      title: 'BuLLM Assistant',
      description: 'Ask the assistant anything about the current screen. It keeps the conversation while you move through the pipeline.',
      side: 'left',
      align: 'start',
    },
  },
  {
    popover: {
      title: 'You are all set',
      description: 'That is the whole layout. Every screen has its own step-by-step tour the first time you open it, and the ? button in the top bar replays the tour of the screen you are on. Now send a goal and add your first documents.',
    },
  },
]

// Upload's third pane (Outputs) is hidden until the first files land; this runs when it opens, and walks
// every control in it one by one.
export const OUTPUTS_TOUR: DriveStep[] = [
  {
    element: '[data-tour="workspace"]',
    popover: {
      title: 'Outputs',
      description: 'This pane opened because your first files are in. It tracks every file and what the pipeline produces from it. Nothing is lost: the original file is always kept.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="up-table"]',
    popover: {
      title: 'The file list',
      description: 'Every uploaded file with its detected Type and a Confidence bar for that detection. A "Needs review" flag means a person should look before parse. Right-click a row (or select it and press the Menu key) to delete a file.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="up-attn"]',
    popover: {
      title: 'Needs attention',
      description: 'Files that could not be used land here with the reason and the fix: Retry when the upload was interrupted, Replace when the file itself is the problem, or Discard to remove it. "Discard all" clears the whole list at once.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="up-lanes"]',
    popover: {
      title: 'Source lanes',
      description: 'Your files counted by kind - Documents, Sheets, Images and Other - so you can see at a glance what the run is working with.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="up-quota"]',
    popover: {
      title: 'Space used',
      description: 'How much of the engagement upload quota this run is using. If you approach the limit, discard files you do not need.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="up-menu"]',
    popover: {
      title: 'More actions',
      description: 'The "..." menu holds Reset: it removes every uploaded file and clears the goal and its draft, so you can start this intake over. The conversation itself is kept.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="action"]',
    popover: {
      title: 'Start ingestion',
      description: 'When the files you need are uploaded, this starts the ingestion run: standardize, parse, then your review.',
      side: 'top',
      align: 'center',
    },
  },
]

export const MASTERS_TOUR: DriveStep[] = [
  {
    element: '[data-tour="workspace"]',
    popover: {
      title: 'Masters',
      description: 'The master data grids that feed Context sync: agents, assistants and the other masters. Edits here are global - they are not tied to one pipeline run.',
      side: 'left',
      align: 'start',
    },
  },
]

// Custom tours, control by control. Everything else falls through to screenTour() below, so every screen
// in the pipeline has a walkthrough.
const CUSTOM: Record<string, DriveStep[]> = {
  // Upload, pane by pane. Two variants: before the goal is sent the hero (goal box, cards, send arrow) is
  // the whole screen, so the tour covers only those; after the goal, the files pane, drop zone, conversation
  // and composer controls are toured instead. uploadTour() picks at runtime from the live DOM.
  '1.1': [],
  // Standardize: classify, keep the original, decide per file.
  '1.8': [
    {
      element: '[data-tour="workspace"]',
      popover: {
        title: 'Standardize',
        description: 'Each uploaded file is classified and checked. The original is always kept; a PDF analysis copy is linked to its source and never replaces native checks.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="std-files"]',
      popover: {
        title: 'The files',
        description: 'Every file with its current state. Click one to open its details and see exactly what the checks found.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="std-decide"]',
      popover: {
        title: 'The decision',
        description: 'Each file comes out one of three ways: ready for parse, fixed locally by AI, or sent to manual review. You see the split here before anything moves on.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="action"]',
      popover: {
        title: 'The next action',
        description: 'Standardize runs on its own once ingestion starts; if anything needs you, the pinned action here says what.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  // Scope: SOW review, control by control, with its in-pane Approve gate.
  '3.1': [
    {
      element: '[data-tour="workspace"]',
      popover: {
        title: 'The Scope (SOW)',
        description: 'The generated statement of work. Read it against your source documents and edit where needed - every edit is versioned, and any change after approval invalidates it.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="sow-toolbar"]',
      popover: {
        title: 'The editing toolbar',
        description: 'Format the document directly: headings, bold and lists, undo and redo. The toolbar is only active while the SOW is editable.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="sow-changes"]',
      popover: {
        title: 'Track changes',
        description: 'The Changes switch colour-codes every edit against the previous version, and the version selector next to it compares any two versions of the SOW.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="sow-doc"]',
      popover: {
        title: 'The document',
        description: 'Click into the text and edit. Nothing here is final until you approve - and approving locks exactly this text.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="sow-approve"]',
      popover: {
        title: 'Approve the Scope',
        description: 'Approving locks this version, unlocks the Grid and starts skill extraction from exactly this text. Reopening later invalidates the approval and everything built on it.',
        side: 'top',
        align: 'end',
      },
    },
  ],
  // Grid: the Agent > Skill review, control by control.
  '3.2': [
    {
      element: '[data-tour="workspace"]',
      popover: {
        title: 'The skills grid',
        description: 'Every Agent > Skill row extracted from the approved SOW. Read each row carefully - everything after this step builds on it.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="grid-tools"]',
      popover: {
        title: 'Changes view',
        description: 'Switch Changes on to colour-code every cell against what the model extracted: green for Added, struck through for Removed, highlighted for Modified. The chip beside it counts your edits.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="grid-cols"]',
      popover: {
        title: 'The seven ISATVON fields',
        description: 'Each skill is described by seven columns: Instructions, Source data, Automation, Tech stack, Variables, Outcome and Next. The grid is wide - click any of these chips to jump straight to that column, or open a row to see all seven fields together.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="grid-table"]',
      popover: {
        title: 'Reading and editing rows',
        description: 'Double-click a cell or just start typing to edit in place; Tab or Enter saves, Esc cancels, Ctrl+Z undoes. Press Enter on a skill name to open its full editor, Shift+Enter to see the SOW passage it came from. Edited and errored cells are marked.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="grid-approve"]',
      popover: {
        title: 'Approve the grid',
        description: 'Approving marks the grid reviewed and generates the manifest template from it. Reopening later marks the later steps stale, so approve only when the rows are right.',
        side: 'top',
        align: 'end',
      },
    },
  ],
  // Template: the manifest and its checks.
  '4.2': [
    {
      element: '[data-tour="workspace"]',
      popover: {
        title: 'Template',
        description: 'The manifest.json that ties the approved Scope and Grid together, with the schema it must satisfy. The check activities (A-D) run on the reviewed grid and are listed here with their status.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="action"]',
      popover: {
        title: 'The next action',
        description: 'The pinned action generates the manifest from the approved grid, or approves it once the checks pass.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  // Translate: the generated code.
  '4.3': [
    {
      element: '[data-tour="workspace"]',
      popover: {
        title: 'Translate',
        description: 'The translated skill code, file by file, with its translation check. Pick a file in the tree to read it; findings link straight to the line they concern.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="action"]',
      popover: {
        title: 'The next action',
        description: 'The pinned action starts the translation or approves the result so Validation can begin.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  // Validation screens share one checklist layout; each pins its own action.
  '4.8': [
    {
      element: '[data-tour="workspace"]',
      popover: {
        title: 'Sandbox',
        description: 'Creates an isolated validation environment and deploys the generated skills into it. Nothing here touches BAM_db - the sandbox is a safe place to prove the artifact.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="val-list"]',
      popover: {
        title: 'The checklist',
        description: 'Each item the sandbox needs, with its status pill. Anything not ready says exactly what is missing.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="action"]',
      popover: {
        title: 'The next action',
        description: 'The pinned action creates and runs the sandbox. The results appear on Check.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  '4.4': [
    {
      element: '[data-tour="workspace"]',
      popover: {
        title: 'Check',
        description: 'The validation results and evidence for the artifact that ran in the Sandbox: every check, its attempts and its findings.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="val-list"]',
      popover: {
        title: 'The results',
        description: 'Each check with its status. Open the earlier runs to compare attempts; a failure always carries its reason.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="action"]',
      popover: {
        title: 'The next action',
        description: 'The pinned action moves a passing result on to Certify, or re-runs what failed.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  '4.5': [
    {
      element: '[data-tour="workspace"]',
      popover: {
        title: 'Certify',
        description: 'Record the formal approval of the checked artifact: which version, which SOW it traces back to, and who certified it.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="val-list"]',
      popover: {
        title: 'Before you certify',
        description: 'The prerequisites, each with its status. Certification only opens when every one of them is met.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="action"]',
      popover: {
        title: 'The next action',
        description: 'The pinned action certifies the artifact. Commit to BAM_db is the separate step that follows.',
        side: 'top',
        align: 'center',
      },
    },
  ],
  '4.6': [
    {
      element: '[data-tour="workspace"]',
      popover: {
        title: 'Commit',
        description: 'Save the certified artifact to BAM_db, then deploy it to Staging. This is the point where the pipeline\'s output becomes a stored, deployable asset.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="val-list"]',
      popover: {
        title: 'The handover list',
        description: 'What will be committed and where it goes, item by item. Staging complete never means production.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="action"]',
      popover: {
        title: 'The next action',
        description: 'The pinned action commits to BAM_db and starts the Staging deploy.',
        side: 'top',
        align: 'center',
      },
    },
  ],
}

// Before the goal is sent: only the controls on the hero screen, starting straight at the goal box (per user,
// 24 Nov 2026: no overview popup on this screen), plus the FDE toggle in the top bar (per user, 25 Nov 2026).
const UPLOAD_BEFORE: DriveStep[] = [
  {
    element: '[data-tour="goal"]',
    popover: {
      title: 'Name the agent',
      description: 'Type what the agent should do, for whom and where, in this box.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="goal-cards"]',
    popover: {
      title: 'What, Who and Where cards',
      description: 'As you type, BuLL reads the What, Who and Where out of your sentence into these cards. Click a card to highlight that part of your sentence and fix it.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="goal-send"]',
    popover: {
      title: 'Send the goal',
      description: 'Press this blue arrow (or Enter) when the sentence reads right.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="env"]',
    popover: {
      title: 'The FDE toggle',
      description: 'Flip between the FDE workspace (blue) and the Staging view (orange) to see the app the way each side sees it. This changes the view, not what is deployed.',
      side: 'bottom',
      align: 'end',
    },
  },
]
// After the goal is sent (per user, 24 Nov 2026): only what is on this screen - Add files, the workflow
// menu, the draft and each of its lettered sections, and the chat controls. No later-screen details.
// When the Outputs third pane is open, uploadTour() continues this tour into the pane (per user, 25 Nov
// 2026), so its controls stay replayable from the ? button after the one-time auto-start has run.
const UPLOAD_AFTER: DriveStep[] = [
  {
    element: '[data-tour="add-files"]',
    popover: {
      title: 'Add files',
      description: 'Adds your source documents: Choose folder takes a whole folder, Bulk upload lets you pick files, Upload zip takes an archive. Each opens a window where you can also drag and drop.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav"]',
    popover: {
      title: 'The workflow menu',
      description: 'Your map of the run. Upload is this screen; Standardize, Parse and Review light up as the run reaches them.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="draft"]',
    popover: {
      title: "Your agent's draft",
      description: 'BuLLM read your goal and drafted the agent: its name, a one-line scope and the lettered sections below. Every section edits in place.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="draft-i"]',
    popover: {
      title: 'I - Instructions',
      description: 'What the agent must do. Click the text, fix the wording, click away - it saves on its own.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="draft-s"]',
    popover: {
      title: 'S - Source data',
      description: 'The sample inputs, business rules and reference data the agent works from. Edit in place like every section.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="draft-a"]',
    popover: {
      title: 'A - Automation',
      description: 'How a piece of work flows from input to delivery. Click the text to edit.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="draft-t"]',
    popover: {
      title: 'T - Tech Stack',
      description: 'The approved tools the agent may use. Click the text to edit.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="draft-v"]',
    popover: {
      title: 'V - Variables',
      description: 'Limits, thresholds and retry bounds. Click the text to edit.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="draft-o"]',
    popover: {
      title: 'O - Outcome',
      description: 'What the finished result contains. Click the text to edit.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="draft-n"]',
    popover: {
      title: 'N - Next',
      description: 'What happens after this draft. Click the text to edit.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="composer"]',
    popover: {
      title: 'Ask BuLLM',
      description: 'Type here to ask BuLLM about the draft, or ask it to change a section - the draft updates in place.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="composer-attach"]',
    popover: {
      title: 'Attach in chat',
      description: 'The + attaches a file to your message, so you can ask about a specific document.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="composer-mic"]',
    popover: {
      title: 'Dictate',
      description: 'The microphone types for you: click it, speak, and your words land in the box. Click again to stop.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="composer-send"]',
    popover: {
      title: 'Send',
      description: 'Send your message to BuLLM. While it answers, this becomes a Stop button.',
      side: 'top',
      align: 'end',
    },
  },
]
// The hero goal box only exists before the goal is sent; that is the state line between the two variants.
function uploadTour(): DriveStep[] {
  const el = document.querySelector('[data-tour="goal"]')
  const preGoal = !!el && el.getBoundingClientRect().width > 0
  if (preGoal) return UPLOAD_BEFORE
  const out = document.querySelector('[data-tour="up-lanes"]')
  const outputsOpen = !!out && out.getBoundingClientRect().width > 0
  return outputsOpen ? [...UPLOAD_AFTER, ...OUTPUTS_TOUR] : UPLOAD_AFTER
}

// Generic screen tour: what the screen is (its registry description) plus its pinned action when visible.
// On a locked screen the action bar is not drawn, so only the first step shows - which doubles as the
// "what this screen does and how it unlocks" explanation.
export function screenTour(id: string, label: string, description: string): DriveStep[] {
  if (id === '1.1') return uploadTour()
  if (CUSTOM[id]) return CUSTOM[id]
  return [
    {
      element: '[data-tour="workspace"]',
      popover: { title: label, description, side: 'left', align: 'start' },
    },
    {
      element: '[data-tour="action"]',
      popover: {
        title: 'The next action',
        description: `The one action for ${label} is pinned here. Nothing moves forward without it.`,
        side: 'top',
        align: 'center',
      },
    },
  ]
}
