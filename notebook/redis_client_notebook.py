import redis as redis

connection_pool = redis.Redis(host='hi-re-42obxf6yfsuv.tqerpw.0001.use1.cache.amazonaws.com', port=6379,db=0)
print("\n\t My Redis connection pool:\n\t", connection_pool)

#connection_pool.set('foo', 'bar')
#connection_pool.get('foo')
try:
    connection_pool.ping()
    print('Successfully connected to redis')
except redis.exceptions.ConnectionError as r_con_error:
    print('Redis connection error')
try:
    print(connection_pool.client_list())
except redis.ConnectionError:
    print("redis connection error")