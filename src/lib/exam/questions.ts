import {
  EXAM_TYPE_LABELS,
  type ExamTypeId,
  isExamTypeId,
} from "./exam-types";

export const EXAM_DURATION_MS = 50 * 60 * 1000;

export type ExamQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type PublicExamQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

const EXAM_A_QUESTIONS: ExamQuestion[] = [
  {
    id: "q1",
    prompt:
      'שוהם נוסע במעלה ההר במהירות של 4 קמ"ש, ויורד ממנו במהירות של 12 קמ"ש. מהי המהירות הממוצעת בה נסע שוהם לראש ההר וחזרה למרגלותיו (בקמ"ש)?',
    options: ["8", "7", "6", "אי אפשר לדעת מהנתונים"],
    correctIndex: 2,
  },
  {
    id: "q2",
    prompt:
      "לאורך הרחוב חונות מכוניות בצמוד למדרכה. אורכה של כל מכונית הוא 5 מטרים והמרחק בין כל שתי מכוניות צמודות הוא 2 מטרים. כמה מכוניות לכל היותר חונות לאורך הרחוב, אם אורכו 145 מטרים?",
    options: ["22", "23", "20", "21"],
    correctIndex: 3,
  },
  {
    id: "q3",
    prompt:
      "מחירו של שדה קטן מהווה 80% ממחירו של שדה גדול. בכמה אחוזים יקר יותר שדה גדול משדה קטן?",
    options: ["20%", "50%", "25%", "12.5%"],
    correctIndex: 2,
  },
  {
    id: "q4",
    prompt:
      "במהלך השעה הראשונה לעבודתו כותב יגאל 8 שורות במחברת, במהלך השעה שאחריה מוחק 4 מהן, וחוזר חלילה. אם כעת המחברת ריקה, כעבור כמה שעות יהיו בה לראשונה 40 שורות?",
    options: ["10", "20", "9", "17"],
    correctIndex: 1,
  },
  {
    id: "q5",
    prompt:
      "ידוע כי צריכת החשמל של נורה מסוג A גדולה פי 2 מצריכת החשמל של נורה מסוג B. בבית של קטיה 4 נורות, כולן מסוג A. היא החליפה 2 מהן בנורות מסוג B. בעקבות השינוי, ירדה צריכת החשמל של הנורות בבית של קטיה ב-",
    options: ["20%", "25%", "40%", "50%"],
    correctIndex: 1,
  },
  {
    id: "q6",
    prompt:
      "רינה רשמה קוד בן 5 ספרות זוגיות השונות זו מזו. ריבה רשמה קוד בן 5 ספרות אי-זוגיות השונות זו מזו, משמאל לקוד שרשמה רינה. כמה קודים שונים בני 10 ספרות יכולים להתקבל?",
    options: ["2∙5!", "5!", "2∙5²", "(5!)²"],
    correctIndex: 3,
  },
  {
    id: "q7",
    prompt:
      "בתוך כד נמצאים כדורים בצבעים שונים. 50% מהכדורים ירוקים, ו-25% מהכדורים אדומים. 20% מהכדורים שאינם ירוקים הם צהובים. איזה אחוז מהכדורים בכד, לכל היותר, הם כחולים?",
    options: ["5%", "15%", "20%", "25%"],
    correctIndex: 1,
  },
  {
    id: "q8",
    prompt:
      "בחודש כלשהו שכרו של דרור עלה ל-20 דולרים לשעה, וכמו כן אחוז המיסים שהוא משלם עלה ל-20%. דרור עובד 100 שעות בחודש, משתכר 10 דולרים לשעה, ומשלם מיסים בסך 4% ממשכורתו. כמה שעות יצטרך דרור לעבוד מעתה בכל חודש כדי שמשכורתו, לאחר תשלום מיסים, לא תשתנה?",
    options: ["100", "80", "60", "420"],
    correctIndex: 2,
  },
  {
    id: "q9",
    prompt:
      "גילו של מושון כיום שווה לסכום גילאי חמש אחיו שנולדו באותו יום (חמישייה). בעוד 3 שנים יהיה גילו קטן ב-12 מסכום גילאי חמשת אחיו. מה יהיה גילו של מושון בעוד 3 שנים?",
    options: ["5", "7", "8", "אי אפשר לדעת מהנתונים"],
    correctIndex: 3,
  },
  {
    id: "q10",
    prompt:
      'גובהם הממוצע של יחזקאל, טוביה ונועם גדול מגובהו של טוביה ב-4 ס"מ. גובהו של טוביה שווה לגובהו של נועם. בכמה ס"מ יחזקאל גבוה מטוביה?',
    options: ["12", "16", "8", "4"],
    correctIndex: 0,
  },
  {
    id: "q11",
    prompt:
      "בחנות של נעמי 8 גולות בצבעים שונים. הלל מעוניין לקנות 3 גולות. כמה אפשרויות שונות עומדות לרשותו?",
    options: ["112", "56", "240", "336"],
    correctIndex: 1,
  },
  {
    id: "q12",
    prompt:
      "אבי שוטף את חדר המדרגות ב-3 שעות. גיא שוטף את חדר המדרגות בקצב שווה לזה של אבי. יום אחד החלו אבי וגיא לשטוף את חדר המדרגות יחד. לאחר שעה המשיך אבי לבדו עד שסיים את השטיפה. כמה שעות עבד אבי לבדו?",
    options: ["1", "2", "חצי", "אחד וחצי"],
    correctIndex: 0,
  },
  {
    id: "q13",
    prompt:
      "מה ההפרש בין המספר הדו-ספרתי הגדול ביותר שספרת העשרות שלו גדולה פי 2 מספרת האחדות שלו, לבין המספר הדו-ספרתי הקטן ביותר המקיים תנאי זה?",
    options: ["57", "63", "72", "74"],
    correctIndex: 3,
  },
  {
    id: "q14",
    prompt:
      "מוטי וסמדר קוטפים אשכוליות בפרדס. מוטי קוטף בקצב של 3 אשכוליות ב-10 דקות. סמדר קוטפת בקצב של 5 אשכוליות ב-15 דקות. כמה אשכוליות הם קוטפים יחד בשעתיים?",
    options: ["64", "76", "84", "96"],
    correctIndex: 1,
  },
  {
    id: "q15",
    prompt:
      "טל לבשה בכל אחד מ-7 ימי השבוע צירוף אחר של סוודר עם צעיף. לטל יש שלושה סוודרים שונים. כמה צעיפים יש לטל לכל הפחות?",
    options: ["6", "7", "3", "4"],
    correctIndex: 2,
  },
  {
    id: "q16",
    prompt:
      'במהלך שבוע חלו במחיר של 1 ק"ג דובדבנים השינויים הבאים: ביום שני היה מחיר 1 ק"ג דובדבנים 75% ממחירו ביום ראשון. מיום שלישי ואילך עלה המחיר בכל יום ב-20% ביחס למחיר ביום הקודם. באיזה יום היה לראשונה מחיר 1 ק"ג דובדבנים גבוה ביותר מ-10% ממחירו ביום ראשון?',
    options: ["יום חמישי", "יום שלישי", "יום שישי", "יום רביעי"],
    correctIndex: 0,
  },
  {
    id: "q17",
    prompt:
      'שמעון יוצא מביתו לביתו של יובב. בדרכו לשם מהירותו 30 קמ"ש. בדרכו חזרה הגביר את מהירותו ל-60 קמ"ש. מה היתה מהירותו הממוצעת לאורך כל הדרך (הלוך וחזור)?',
    options: ["40", "45", "50", "אי אפשר לדעת מהנתונים"],
    correctIndex: 0,
  },
  {
    id: "q18",
    prompt:
      "במשחק כלשהו בכל תור שחקן יכול או להפסיד נקודה אחת או להרוויח מספר נקודות שלם וקבוע P (בתחילת המשחק הניקוד הוא 0 וייתכן במהלך המשחק גם ניקוד שלילי). דני שיחק שמונה תורות במשחק, ובסופם היו לו 28 נקודות. ידוע שהוא הרוויח ביותר ממחצית התורות. P = ?",
    options: ["5", "2", "3", "7"],
    correctIndex: 0,
  },
  {
    id: "q19",
    prompt:
      "4 פתקים מונחים על ארבע פינותיו של שולחן. על כל אחד מהפתקים כתוב מספר אחד בלבד, ומספר זה הוא הממוצע של המספרים הכתובים על שני הפתקים שבפינות הסמוכות לו. כמה מספרים שונים כתובים על הפתקים, לכל היותר?",
    options: ["1", "2", "3", "4"],
    correctIndex: 1,
  },
  {
    id: "q20",
    prompt:
      "בטורניר שש-בש משתתפים 4 שחקנים. כל שחקן משחק מול כל אחד מ-3 השחקנים האחרים. בכל סיבוב בטורניר מתקיימים שני משחקים בעת ובעונה אחת. כל סיבוב נמשך 15 דקות. כמה דקות לכל הפחות נמשך הטורניר?",
    options: ["60", "45", "30", "15"],
    correctIndex: 1,
  },
];

const EXAM_B_QUESTIONS: ExamQuestion[] = [
  {
    id: "q1",
    prompt:
      "לרס\"ר הבסיס 6 חיילים. הוא צריך לבחור 2 חיילים לעבודות גינון ו-4 חיילים לעבודות שמירה. מה מהבאים נכון בהכרח?",
    options: [
      "מספר הצירופים לבחירת הגננים גדול ממספר הצירופים לבחירת השומרים",
      "מספר הצירופים לבחירת השומרים גדול ממספר הצירופים לבחירת הגננים",
      "מספר הצירופים בשני המקרים שווה",
      "אף לא אחת מהתשובות שלעיל נכונה בהכרח",
    ],
    correctIndex: 2,
  },
  {
    id: "q2",
    prompt:
      "מחשבון כלשהו מסוגל לבצע שתי פעולות חישוב בלבד: להעלות מספר בריבוע, ולחשב עצרת. הֵזינו למחשבון מספר שלם חיובי מסוים, והמחשבון ביצע עליו את אחת מפעולות החישוב. על התוצאה שהתקבלה הוא ביצע את פעולת החישוב האחרת. איזה מהמספרים הבאים אינו יכול להיות התוצאה הסופית שהתקבלה במחשבון?",
    options: ["6", "24", "36", "4"],
    correctIndex: 0,
  },
  {
    id: "q3",
    prompt:
      "בתזמורת כלשהי מספר נגני הכינור הוא שליש ממספר נגני כלי המיתר וחמישית ממספר נגני התזמורת כולה. לפיכך, מספר נגני כלי המיתר הוא______ ממספר נגני התזמורת כולה",
    options: ["60%", "66 2/3", "33 1/3", "40%"],
    correctIndex: 0,
  },
  {
    id: "q4",
    prompt:
      "חמישה שחקני קלפים יושבים במעגל. שחקן א מחלק ביניהם חפיסת קלפים בת 104 קלפים באופן שלהלן: את זוג הקלפים הראשון הוא נותן לעצמו, את זוג הקלפים הבא הוא נותן לשחקן ב, וכך ממשיך עם כיוון השעון. מי השחקן שיקבל את זוג הקלפים האחרון?",
    options: ["א", "ב", "ה", "ד"],
    correctIndex: 1,
  },
  {
    id: "q5",
    prompt:
      "נתונה פירמידה משולשת שכל פאותיה הן משולשים שווי-צלעות. פאות הפירמידה ממוספרות במספרים שלמים עוקבים, מ-1 ואילך. מטילים את הפירמידה פעמיים. תוצאת ההטלה של הפירמידה היא המספר המופיע על הפאה הצמודה לקרקע. ידוע כי סיכויי הפירמידה ליפול על כל אחת מהפאות שווים. מה ההסתברות שסכום שתי ההטלות יהיה 4?",
    options: ["3/25", "3/16", "1/3", "1/4"],
    correctIndex: 1,
  },
  {
    id: "q6",
    prompt:
      'אורכו ורוחבו של מלבן כלשהו הם מספרים שלמים בס"מ (האורך גדול מהרוחב). שטח המלבן 91 סמ"ר. אם ידוע כי רוחב המלבן גדול מ-1 ס"מ, מהו אורכו (בס"מ)?',
    options: ["9", "11", "13", "אי אפשר לדעת מהנתונים"],
    correctIndex: 2,
  },
  {
    id: "q7",
    prompt:
      "תמר עוברת דרך מסוימת בזמן מסוים. עודד עובר דרך קצרה פי 2 בזמן ארוך פי 3. לכל אחד מהם מהירות קבועה. מהירותו של עודד ממהירותה של תמר?",
    options: [
      "קטנה פי 2/3",
      "גדולה פי 2/3",
      "קטנה פי 6",
      "גדולה פי 6",
    ],
    correctIndex: 2,
  },
  {
    id: "q8",
    prompt:
      "רונית היא בעלת מינימרקט שבו שתי קופות. בוקר אחד, עם פתיחת המינימרקט, היא עקבה במשך שעה אחר הנעשה בקופות ומצאה כי בקופה א התחלף לקוח כל 20 דקות, ובקופה ב - כל 6 דקות. כמו כן היא מצאה שבקופה א כל לקוח קנה (בממוצע) 15 מוצרים, ובקופה ב - 6 מוצרים. כמה מוצרים נקנו במינימרקט במהלך אותה שעה?",
    options: ["105", "200", "260", "336"],
    correctIndex: 0,
  },
  {
    id: "q9",
    prompt:
      "לשרית מחזיק מפתחות בצורת קובייה ששרשרת משתלשלת מאחד מקודקודיה. היא רוצה לצבוע כל אחד מ-8 קודקודי הקובייה באדום או בצהוב, כך שלא יהיו שני קודקודים הנמצאים על אותו מקצוע שצבועים באותו הצבע. בכמה דרכים שונות היא יכולה לעשות זאת?",
    options: ["0", "2", "8", "4"],
    correctIndex: 1,
  },
  {
    id: "q10",
    prompt:
      'נתונות שתי פירמידות, A ו-B, שבסיסיהן הם מלבנים השונים זה מזה. לשתי הפירמידות אותו הגובה ואותו הנפח.\n\nנתון: בפירמידה A אורכי צלעות הבסיס הם 1 ס"מ ו-6 ס"מ. בפירמידה B אורך אחת מצלעות הבסיס הוא 2 ס"מ. באיזו מהפירמידות היקף הבסיס גדול יותר?',
    options: [
      "A",
      "B",
      "בסיסי שתי הפירמידות שווים בהיקפם",
      "אי אפשר לדעת על פי הנתונים",
    ],
    correctIndex: 0,
  },
  {
    id: "q11",
    prompt:
      "בכפית מלאה בשמרי אפייה יש 100,000,000 תאי שמרים. אורכו של כל תא הוא 5×10⁻⁶ מטרים. מה אורכם הכולל בקילומטרים של תאי השמרים בכפית?",
    options: ["50", "5", "0.5", "0.05"],
    correctIndex: 2,
  },
  {
    id: "q12",
    prompt:
      'נתונה קובייה המורכבת מ-64 קוביות זהות שאורך מקצוען 1 ס"מ. הורידו את שמונה הקוביות הפינתיות. מה ההפרש (בסמ"ר) בין שטח הפנים של הקובייה המקורית, לבין שטח הפנים של הצורה החדשה שנוצרה?',
    options: ["0", "8", "12", "4"],
    correctIndex: 0,
  },
  {
    id: "q13",
    prompt:
      "ישראל גבוה ב-5% מניר. ניר גבוה ב-5% מגילי. איזו מהטענות הבאות אינה נכונה?",
    options: [
      'ההפרש (בס"מ) בין הגובה של ניר ושל גילי קטן יותר מההפרש (בס"מ) בין הגובה של ישראל ושל ניר.',
      "ההפרש בין הגובה של גילי ושל ישראל קטן יותר מ-10% מגובהו של ישראל.",
      "ההפרש בין הגובה של גילי ושל ישראל קטן יותר מ-10% מגובהו של ניר.",
      "ההפרש בין הגובה של גילי ושל ישראל קטן יותר מ-10% מגובה של גילי.",
    ],
    correctIndex: 3,
  },
  {
    id: "q14",
    prompt:
      "מספר הבולים של אביתר גדול ב-40% מזה של אחיו מולי. לאחר שהעביר לאחיו מולי 9 בולים השתווה מספר הבולים של השניים. כמה בולים היו לאביתר לפני ההעברה?",
    options: ["63", "54", "36", "45"],
    correctIndex: 0,
  },
  {
    id: "q15",
    prompt:
      "נתון: מספר המבקרים במסעדת כרמלה ירד בשנה הנוכחית בהשוואה לשנה שקדמה לה. יוסי עבר באקראי ליד מטבח המסעדה ושמע את השיחה הבאה בין שני השפים.\nשף א: המצב נובע מכך שיותר ויותר בני אדם מעדיפים אורח חיים צמחוני.\nשף ב: אבל התפריט במסעדה שונה השנה, וכמו כן מסעדת ציונה הסמוכה עמוסה לעייפה כל יום.\nאיזה מהטענות הבאות אינה יכולה להשתמע מחילופי הדברים?",
    options: [
      "מסעדת כרמלה הציעה בשנה הקודמת תפריט בשרי",
      "מסעדת כרמלה מציעה השנה תפריט צמחוני",
      "מסעדת ציונה מציעה תפריט בשרי",
      "מסעדת ציונה מציעה תפריט צמחוני",
    ],
    correctIndex: 2,
  },
  {
    id: "q16",
    prompt:
      'אסדה שמהירותה 50 קמ"ש יוצא לשייט במעלה הזרם. אם מהירות הזרם היא 10 קמ"ש, בכמה שעות תעבור האסדה דרך של 240 ק"מ?',
    options: ["5", "6", "3", "4"],
    correctIndex: 1,
  },
  {
    id: "q17",
    prompt:
      'במאה ה-19 חי באנגלי מתמטיקאי דגול ושמו דה-מורגן. הוא מת בשנת 1871. באותה שנה חיבר חידה שפתרונה רמז על שנת הולדתו, וזה נוסח החידה: "בשנת איקס בריבוע הייתי בן איקס שנים". בן כמה היה דה-מורגן במותו?',
    options: ["64", "65", "66", "67"],
    correctIndex: 1,
  },
  {
    id: "q18",
    prompt:
      'אשה רחצה כלים בנהר, כאשר האחראי לטיב מי הנהר שאל אותה: "מדוע יש לך כל-כך הרבה כלים לרחוץ?" — "כי חגגנו בבית." — "כמה אנשים השתתפו במסיבה?" — "אינני יודעת. אבל כל שני אנשים השתמשו בכלי משותף לאורז, כל שלושה אנשים בכלי משותף למרק וכל ארבעה אנשים בכלי משותף לבשר — והיו לי 65 כלים לרחוץ."\nכמה אנשים השתתפו במסיבה?',
    options: ["60", "56", "52", "48"],
    correctIndex: 0,
  },
  {
    id: "q19",
    prompt:
      "ראיתי שלוש ספינות מפליגות פנימה. אלו היו שלוש ספינות מפרשים בעלות תרנים מרובעים, ולכן לא הופתעתי לגלות שטונאז' (משקל) הספינה הקטנה ביותר היה 400, שהוא מספר ריבועי. עם זאת, הופתעתי מאוד לגלות שטונאז' שתי הספינות האחרות היו שני מספרים ריבועיים שונים בני שלוש ספרות. הופתעתי עוד יותר לגלות שסכום הטונאז' של שלוש הספינות יחד היה גם הוא מספר ריבועי, ואף יותר מכך — הריבוע של מספר משולשי. מה היו הטונאז'ים של שתי הספינות הגדולות, ומה היה הטונאז' הכולל של שלוש הספינות?",
    options: [
      "784, 900, 2084",
      "625, 900, 1925",
      "729, 900, 2029",
      "784, 841, 2025",
    ],
    correctIndex: 3,
  },
  {
    id: "q20",
    prompt:
      "אדם קיבל הוראה מהרופא להתחיל ולבלוע החל מהיום 3 סוגי כדורים. מהסוג הראשון: 2 כדורים ביום, מקופסאות המכילות 60 כדורים. מהסוג השני: 1 כדור ביום, מקופסאות המכילות 40 כדורים. מהסוג השלישי: 1 כדור ביום, מקופסאות המכילות 45 כדורים. כשמתרוקנת קופסה, פותחים חדשה וממשיכים לבלוע לפי ההוראות. כעבור כמה ימים יקרה לראשונה מצב בו יתרוקנו (בו-זמנית) כל 3 הקופסאות?",
    options: ["120", "180", "240", "360"],
    correctIndex: 3,
  },
];

type ExamDefinition = {
  title: string;
  durationMs: number;
  questions: ExamQuestion[];
};

function cloneExamQuestions(questions: ExamQuestion[]): ExamQuestion[] {
  return questions.map((question) => ({
    ...question,
    options: [...question.options],
  }));
}

function createDefaultExam(
  title: string,
  questions: ExamQuestion[]
): ExamDefinition {
  return {
    title,
    durationMs: EXAM_DURATION_MS,
    questions: normalizeQuestions(cloneExamQuestions(questions)),
  };
}

const examBanks: Record<ExamTypeId, ExamDefinition> = {
  "exam-a": createDefaultExam(
    `מבחן כמותי — ${EXAM_TYPE_LABELS["exam-a"]}`,
    EXAM_A_QUESTIONS
  ),
  "exam-b": createDefaultExam(
    `מבחן Beyond Code — ${EXAM_TYPE_LABELS["exam-b"]}`,
    EXAM_B_QUESTIONS
  ),
  "exam-c": createDefaultExam(
    `מבחן כמותי — ${EXAM_TYPE_LABELS["exam-c"]}`,
    EXAM_A_QUESTIONS
  ),
};

function getBank(examTypeId: ExamTypeId): ExamDefinition {
  return examBanks[examTypeId];
}

function clonePublicQuestion(question: ExamQuestion): PublicExamQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    options: [...question.options],
  };
}

function clonePrivateQuestion(question: ExamQuestion): ExamQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    options: [...question.options],
    correctIndex: question.correctIndex,
  };
}

function normalizeQuestionId(index: number): string {
  return `q${index + 1}`;
}

function normalizeQuestions(questions: ExamQuestion[]): ExamQuestion[] {
  return questions.map((question, index) => ({
    ...clonePrivateQuestion(question),
    id: normalizeQuestionId(index),
  }));
}

export function getPublicQuestions(examTypeId: ExamTypeId): PublicExamQuestion[] {
  return getBank(examTypeId).questions.map(clonePublicQuestion);
}

export function getExamDurationMs(examTypeId: ExamTypeId): number {
  return getBank(examTypeId).durationMs;
}

export function getExamQuestionCount(examTypeId: ExamTypeId): number {
  return getBank(examTypeId).questions.length;
}

export function getAdminEditableExam(examTypeId: ExamTypeId) {
  const bank = getBank(examTypeId);
  return {
    examTypeId,
    title: bank.title,
    durationMinutes: Math.round(bank.durationMs / 60000),
    questions: bank.questions.map(clonePrivateQuestion),
  };
}

type UpdateExamInputQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type UpdateExamInput = {
  title: string;
  durationMinutes: number;
  questions: UpdateExamInputQuestion[];
};

export function updateExamDefinition(
  examTypeId: ExamTypeId,
  input: UpdateExamInput
) {
  const nextTitle = input.title.trim();
  if (!nextTitle) {
    throw new Error("יש להזין שם למבחן.");
  }

  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 5 ||
    input.durationMinutes > 180
  ) {
    throw new Error("משך המבחן חייב להיות בין 5 ל-180 דקות.");
  }

  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    throw new Error("יש להזין לפחות שאלה אחת.");
  }

  const parsedQuestions: ExamQuestion[] = input.questions.map((question, index) => {
    const prompt = question.prompt.trim();
    if (!prompt) {
      throw new Error(`בשאלה ${index + 1} חסר נוסח שאלה.`);
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error(`בשאלה ${index + 1} נדרשות לפחות שתי אפשרויות.`);
    }

    const options = question.options.map((option, optionIndex) => {
      const value = option.trim();
      if (!value) {
        throw new Error(
          `בשאלה ${index + 1}, אפשרות ${optionIndex + 1} ריקה.`
        );
      }
      return value;
    });

    if (
      !Number.isInteger(question.correctIndex) ||
      question.correctIndex < 0 ||
      question.correctIndex >= options.length
    ) {
      throw new Error(`בשאלה ${index + 1} התשובה הנכונה לא תקינה.`);
    }

    return {
      id: normalizeQuestionId(index),
      prompt,
      options,
      correctIndex: question.correctIndex,
    };
  });

  examBanks[examTypeId] = {
    title: nextTitle,
    durationMs: input.durationMinutes * 60 * 1000,
    questions: normalizeQuestions(parsedQuestions),
  };
}

/**
 * Grades answers in question order. Each correct answer contributes equally to 100 points.
 */
export function gradeAnswers(
  examTypeId: ExamTypeId,
  answers: (number | null)[]
): number {
  const questions = getBank(examTypeId).questions;
  if (answers.length !== questions.length || questions.length === 0) {
    return 0;
  }

  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    const selected = answers[i] ?? null;
    if (selected === questions[i].correctIndex) {
      correct++;
    }
  }
  return Math.round((correct / questions.length) * 100);
}

export function getQuestionIds(examTypeId: ExamTypeId): string[] {
  return getBank(examTypeId).questions.map((q) => q.id);
}

export { isExamTypeId };
