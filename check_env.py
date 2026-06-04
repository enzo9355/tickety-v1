content = open('/etc/okx-trading-bot/okx-bot.env').read()
for line in content.splitlines():
    for key in ['API_KEY', 'SECRET_KEY', 'PASSPHRASE']:
        if line.startswith(key + '='):
            val = line.split('=', 1)[1]
            try:
                val.encode('latin-1')
                print(key + ': OK  len=' + str(len(val)))
            except UnicodeEncodeError as e:
                print(key + ': FAIL at pos ' + str(e.start) + '-' + str(e.end) + '  ordinal=' + str(ord(val[e.start])))
