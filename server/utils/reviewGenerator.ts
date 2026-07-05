import { logger } from './logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BENGALI_NAMES_POOL = [
  "Aarav", "Vihaan", "Reyansh", "Advik", "Ayan", "Ishaan", "Shrey", "Anirban", 
  "Sagnik", "Shirshendu", "Sayantan", "Sudipto", "Arindam", "Debargha", 
  "Arnav (Arnab)", "Mihir", "Palash", "Shayak",
  "Ahana", "Anvi", "Oishi", "Navya", "Saanvi", "Diya", "Aanya", "Ritabhari", 
  "Oindrila", "Charulata", "Mrinmayee", "Shreemoyee", "Sayantani", "Debosmita", 
  "Brishti", "Hiya", "Jui", "Keya", "Mihika", "Titli"
];

const NAMES_POOL = [
  "Aarav P.", "Priya S.", "Rohan D.", "Ananya K.", "Kavya M.", 
  "Vikram C.", "Neha R.", "Aditya V.", "Shruti B.", "Arjun N.",
  "Meera I.", "Karthik G.", "Sneha T.", "Rahul J.", "Divya L.",
  "Siddharth M.", "Pooja A.", "Vivek S.", "Riya C.", "Manish K.",
  "Anjali P.", "Suresh R.", "Nandini D.", "Gaurav H.", "Swati V.",
  "Tariq M.", "Zoya F.", "Harpreet S.", "Simran K.", "Anand Y.",
  ...BENGALI_NAMES_POOL
];

const REVIEW_TEMPLATES_POSITIVE = [
  { title: "Absolutely brilliant!", comment: "I couldn't put this down. The way the concepts are explained is simply masterful. Highly recommend to anyone interested in this topic." },
  { title: "A must-read", comment: "This book exceeded all my expectations. The pacing is perfect and the insights are incredibly valuable. I've already bought a copy for a friend." },
  { title: "Deeply insightful", comment: "One of the best books I've read this year. It strikes the perfect balance between depth and accessibility. The author really knows their stuff." },
  { title: "Transformed my perspective", comment: "This was a life-changing read. The chapters are well-structured, making complex ideas easy to digest. Five stars aren't enough." },
  { title: "Exceptional quality", comment: "From the cover design to the actual content, everything about this book screams quality. A fantastic addition to my library." },
  { title: "Very engaging", comment: "I was hooked from the first page. The writing style is conversational yet academic, which is exactly what I was looking for." },
  { title: "Great value", comment: "For the price, the amount of knowledge packed into these pages is incredible. A truly worthwhile investment." },
  { title: "Beautifully written", comment: "The prose is elegant and the arguments are compelling. I found myself highlighting almost every page!" },
  { title: "Highly informative", comment: "If you want to understand this subject deeply, this is the definitive guide. Comprehensive and easy to read." },
  { title: "Loved every chapter", comment: "Such an enjoyable read. The author has a unique voice that makes the subject matter come alive. Fantastic work!" }
];

const REVIEW_TEMPLATES_MIXED = [
  { title: "Good, but could be better", comment: "There are some really great insights here, but the middle chapters dragged a bit for me. Still a solid read overall." },
  { title: "Solid foundation", comment: "A decent introduction to the topic. I was hoping for a bit more advanced material, but it does exactly what it promises." },
  { title: "Interesting perspective", comment: "I didn't agree with everything the author said, but it certainly made me think. Worth reading if you want to challenge your views." },
  { title: "Well-researched", comment: "The research is impeccable, though the academic tone makes it a bit dry in places. Good for students and professionals." },
  { title: "A mixed bag", comment: "Some chapters were absolutely brilliant, while others felt like filler. Overall, I'm glad I read it." }
];

const REVIEW_TEMPLATES_CRITICAL = [
  { title: "A bit disappointed", comment: "I had high hopes for this one based on the description, but it felt a little repetitive. It could have been shorter." },
  { title: "Not for beginners", comment: "Be warned, this book assumes you already have a deep understanding of the subject. It was quite difficult to get through." },
  { title: "Missed the mark", comment: "The premise was great, but the execution fell flat for me. The pacing was uneven." }
];

function getRandomItem(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDateWithinMonths(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - Math.floor(Math.random() * months));
  date.setDate(date.getDate() - Math.floor(Math.random() * 28));
  return date;
}

export async function generateReviewsForBook(bookId: string) {
  try {
    const book = await prisma.book.findUnique({ 
      where: { id: bookId },
      include: { category: true }
    });
    if (!book) return;

    const isBengaliCategory = book.category?.name.toLowerCase().includes('bengali') || false;
    const reviewerNamesList = isBengaliCategory ? BENGALI_NAMES_POOL : NAMES_POOL;

    // Randomize 2 to 5 reviews
    const numReviews = Math.floor(Math.random() * 4) + 2;
    
    let totalScore = 0;
    
    const newReviews = [];

    for (let i = 0; i < numReviews; i++) {
      // 80% chance for positive (4 or 5 stars), 15% for mixed (3 or 4 stars), 5% for critical (1 or 2 stars)
      const roll = Math.random();
      let rating, template;
      
      if (roll > 0.2) {
        rating = Math.random() > 0.5 ? 5 : 4;
        template = getRandomItem(REVIEW_TEMPLATES_POSITIVE);
      } else if (roll > 0.05) {
        rating = Math.random() > 0.5 ? 4 : 3;
        template = getRandomItem(REVIEW_TEMPLATES_MIXED);
      } else {
        rating = Math.random() > 0.5 ? 2 : 1;
        template = getRandomItem(REVIEW_TEMPLATES_CRITICAL);
      }

      totalScore += rating;

      const reviewerName = getRandomItem(reviewerNamesList);
      // Random date within the last 8 months
      const createdAt = getRandomDateWithinMonths(8);
      // 70% chance of being a verified purchase
      const isVerified = Math.random() > 0.3;

      newReviews.push({
        bookId,
        reviewerName,
        rating,
        title: template.title,
        comment: template.comment,
        isVerified,
        createdAt
      });
    }

    // Insert all reviews
    await prisma.review.createMany({
      data: newReviews
    });

    // Update book aggregate rating and review count
    const averageRating = totalScore / numReviews;

    await prisma.book.update({
      where: { id: bookId },
      data: {
        rating: Number(averageRating.toFixed(1)),
        reviewCount: numReviews
      }
    });

    logger.info(`Generated ${numReviews} reviews for book ${bookId}`);
  } catch (error) {
    logger.error(error, "Failed to generate reviews");
  }
}
