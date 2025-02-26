import { fetchReviews } from './api/fetchReviews';
import { getToken } from './api/getToken';
import { sleep as _sleep } from './util';
import { GetReviewsParams, Review, GetReviewsResponse } from './types';

// Now accepts both cutoffOldest and cutoffRecent.
export const getReviews = async ({
  country,
  appId,
  appName,
  numberOfReviews = 0,
  sleep = 1,
  cutoffOldest,   // reviews older than this are not included (and fetching stops)
  cutoffRecent,   // reviews newer than this are skipped
}: GetReviewsParams & { cutoffOldest?: Date, cutoffRecent?: Date }) => {
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
        const reviewDate = new Date(obj.attributes.date);
        // Skip reviews that are too new.
        if (cutoffRecent && reviewDate > cutoffRecent) {
          continue;
        }
        // If a review is older than our oldest cutoff, then stop fetching further.
        if (cutoffOldest && reviewDate < cutoffOldest) {
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

    console.log("App Name:", appName, "Review Count:", reviewCount);
    await _sleep(sleep);
  }

  return reviews;
};