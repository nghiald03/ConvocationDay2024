import { calendarEvents, categories, Category } from './data';
import CalendarView from './calender-view';

const CalenderPage = () => {
  const events = calendarEvents;
  const categoriess = categories;
  const formattedCategories = categoriess.map((category: Category) => ({
    ...category,
    activeClass: '',
  }));
  return (
    <div>
      <CalendarView events={events} categories={formattedCategories} />
    </div>
  );
};

export default CalenderPage;
