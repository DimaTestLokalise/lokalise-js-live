# lokalise-live-js
Lokalise Live JavaScript library. Edit and save translations directly at your web-page.

# Installation & Setup
- include `lokalise.js` or `lokalise.min.js` in your html
- Initialize script at the end of your html (jest before Body tag ends)
```
Lokalise.init(ProjectId, Locale, ClassName, Callback);
```

| Argument  | Example                            | Description |
| --------- | ---------------------------------- | --- |
| ProjectId | '11122221232.1122221'              | Project ID can be found in project settings at https://lokalise.co |
| Locale    | 'en'                               | Current locale for translations |
| ClassName | 'lokalise'                         | HTML class to handle translations |
| Callback  | `function (key, value, locale) {}` | Callback function. Useful for updating local translation files with Ajax. |

# Key-based commands

| Command                 | Description |
| ----------------------- | ----------- |
| ⌘+shift+e, ctrl+shift+e | Enable/Disable live editing. Oauth is used to enable edit mode. |
| ⌘+i, ctrl+i             | Make selected text *Italic* |
| ⌘+b, ctrl+b             | Make selected text **Bold** |
| ⌘+u, ctrl+u             | Make selected text Underlined |
| ⌘+h, ctrl+h             | Insert HTML at cursor position |
| ⌘+/, ctrl+/             | Insert link (anchor) at cursor position |
| ⌘+s, ctrl+s             | Save current string (also save is automatically triggered on blur event) |

# Dependencies
There is no dependencies, excluding to use Lokalise.co as a translation platform :)

# HTML Example

```
<!DOCTYPE html>
<html>
<head>
    <title>Lokalise live js</title>
</head>

<body>

<div id="content">
    <h1 class="lokalise" data-key="my.key.heading">Hello World!</h1>
    <p class="lokalise" data-key="my.key.description">
        <ul>
            <li>HTML can be editable too!</li>
        </ul>
    </p>
</div>

<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.0/jquery.min.js"></script>
<script type="text/javascript" src="lokalise.js"></script>
<script>
    Lokalise.init('5782046456a88a0cdd0c77.42203357', 'en', 'lokalise', function (key, value, locale) {
        $.ajax({
            type: 'POST',
            url: '/ajax/translations/update',
            data: {
                'key': key,
                'translation': value,
                'locale': locale
            },
            success: function () {
                console.info('Translation has been updated', key, value, locale);
            },
            error: function () {
                alert('Could not update translation');
            }
        });
    });
</script>

</body>
</html>
```
