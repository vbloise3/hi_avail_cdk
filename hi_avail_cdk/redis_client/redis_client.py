import redis as redis

connection_pool = redis.Redis(host='hi-re-42obxf6yfsuv.tqerpw.0001.use1.cache.amazonaws.com', port=6379,db=0)
print("\n\t My Redis connection pool:\n\t", connection_pool)
