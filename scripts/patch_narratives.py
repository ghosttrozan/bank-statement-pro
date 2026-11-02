path = r'bank-statement-generator\java-backend\src\main\java\com\statementpro\engine\NarrativeBuilder.java'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    'return "UPI/" + ref + "/" + hh + ":" + mm + ":" + ss + "/UPI/" + merch.handle() + "/" + direction;',
    'return "UPI/" + ref + "/" + direction + "/" + merch.name().toUpperCase() + "/" + bank + "/" + merch.handle() + "/Paymen";'
)

c = c.replace(
    'return "UPI/" + ref + "/" + hh + ":" + mm + ":" + ss + "/UPI/" + vpa + "/" + direction;',
    'return "UPI/" + ref + "/" + direction + "/" + firstName + "/" + bank + "/" + vpaHandle + "/Paymen";'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated NarrativeBuilder.java')

