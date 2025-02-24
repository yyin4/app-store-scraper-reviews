import { fetchReviews } from './api/fetchReviews';
import { getToken } from './api/getToken';
import { sleep as _sleep } from './util';
import { GetReviewsParams, Review, GetReviewsResponse } from './types';

// Added an optional cutoffDate parameter. (If needed, update the types accordingly.)
export const getReviews = async ({
  country,
  appId,
  appName,
  numberOfReviews = 0,
  sleep = 1,
  cutoffDate, // new optional parameter of type Date
}: GetReviewsParams & { cutoffDate?: Date }) => {
  const token = await getToken({
    country,
    appId,
    appName,
  });

  const reviews: Review[] = [];
  const offsetRegex = /offset=(\d+)/;
  let offset = 0;
  let reviewCount = 0;
  let stopFetching = false;

  while (true) {
    const result: GetReviewsResponse = await fetchReviews({
      country,
      appId,
      appName,
      token,
      offset,
    });

    if (Array.isArray(result?.data)) {
      for (const obj of result.data) {
        // If a cutoff date is provided and this review is older, stop fetching further.
        if (cutoffDate && new Date(obj.attributes.date) < cutoffDate) {
          stopFetching = true;
          break;
        }
        reviews.push(obj);
        reviewCount++;
        if (numberOfReviews > 0 && reviewCount >= numberOfReviews) {
          stopFetching = true;
          break;
        }
      }
    }

    if (stopFetching) {
      break;
    }

    const match = result?.next?.match(offsetRegex);
    if (match) {
      offset = Number(match[1]);
    } else {
      break;
    }

    console.log("App Name: ", appName, "Review Count: ", reviewCount);
    await _sleep(sleep);
  }

  return reviews;
};