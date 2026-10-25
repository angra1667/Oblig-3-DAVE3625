### What AI Did I Use?
I used Claude as my AI coding assistant to build a study planner for university students. I started by asking for a simple feature list and layout without any code. Then I built the app in small steps instead of asking for everything at once.

### How Did I Tweak It?
Version 1 let me add courses with colors and deadlines with a course, type and due date. They appear in a list sorted by date and are saved in the browser. I then asked for a calendar showing assignments, exams and weekly lectures, plus comments. Deadline comments are written when the deadline is added. Lecture comments are written per date under the calendar, become read-only after saving, and can only be deleted. I replaced “estimated hours” with a mandatory due time. I also customised the design with a pastel palette, Courier headings, a monospace body font and squarer corners, and split the code into separate HTML, CSS and JavaScript files.

### Does It Work?
The application works. I can add, sort, complete and delete courses, deadlines and lectures, see them on the calendar, and the data is still there after a refresh. [Add your own testing here, for example which devices and browsers you tried.]

### How Did I Test It?
I tested it by interacting with the application. Testing found real bugs that I reported back to the AI. First, the “Delete comment” button did nothing, because the browser’s built-in confirm box is blocked in the preview. The AI replaced it with its own in-page dialog, which also fixed deleting courses. Second, sections overlapped on wide screens, because the sidebar content was wider than its column after I changed the font. The AI reproduced the problem in a headless browser, fixed the layout so columns can shrink, and checked it at four screen widths. It also fixed clipped time fields.
