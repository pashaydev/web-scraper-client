export type HistoryRecord = {
	query: string;
	type: string;
	timestamp: number;
	result: string;
};

export type Pagination = {
	cur: number;
	maxPerPage: number;
	total: number;
};
