// יצירות: כל נושא מהידע, ההבנה והיישום של האפליקציה הופך לחדר עם יצירות בעיצובים שונים.
// הרכיב המשותף <app-creations> (AppOfApp-GH/public/creations.js) מציג אותן, מדפיס A4 ומעלה לחדר ב-TAARUCHA.
// הנתונים: web/public/creations.json, נגזר מ-data.json ב-scripts/creations.mjs.
export default function Creations() {
  return (
    <div className="creations-page">
      <app-creations src="./creations.json" heading="מה הענקים יוצרים" />
    </div>
  );
}
